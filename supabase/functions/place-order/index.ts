import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { public_service_id, link, quantity } = await req.json();
    if (!public_service_id || !link || !quantity) {
      return new Response(JSON.stringify({ error: "Missing fields: public_service_id, link, quantity" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the service
    const { data: service, error: svcError } = await adminClient
      .from("public_services")
      .select("*")
      .eq("id", public_service_id)
      .eq("status", "active")
      .single();

    if (svcError || !service) {
      return new Response(JSON.stringify({ error: "Service not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (quantity < service.min_quantity || quantity > service.max_quantity) {
      return new Response(JSON.stringify({ error: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("wallet_balance, wallet_currency")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick the rate matching user's locked currency
    // wallet_balance is stored in the SAME currency as wallet_currency
    // INR user → wallet stores INR, use rate_inr
    // USDT user → wallet stores USDT, use rate_usdt
    let rateToUse = service.rate_usdt; // default USDT
    let currencyLabel = "USDT";
    let currencySymbol = "$";

    if (profile.wallet_currency === "INR") {
      rateToUse = service.rate_inr;
      currencyLabel = "INR";
      currencySymbol = "₹";
    } else if (profile.wallet_currency === "USDT") {
      rateToUse = service.rate_usdt;
      currencyLabel = "USDT";
      currencySymbol = "$";
    }

    // Exact charge = rate per 1000 × quantity / 1000
    const totalCharge = (rateToUse / 1000) * quantity;

    // Check balance — wallet_balance is in the same currency
    if (profile.wallet_balance < totalCharge) {
      return new Response(JSON.stringify({
        error: `Insufficient balance. Need ${currencySymbol}${totalCharge.toFixed(2)}, available: ${currencySymbol}${profile.wallet_balance.toFixed(2)}`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct exact amount from wallet
    const newBalance = profile.wallet_balance - totalCharge;
    await adminClient
      .from("profiles")
      .update({ wallet_balance: newBalance })
      .eq("user_id", user.id);

    // Record transaction with exact amount
    await adminClient.from("transactions").insert({
      user_id: user.id,
      amount: -totalCharge,
      type: "order",
      description: `Order: ${service.name} x${quantity} (${currencySymbol}${totalCharge.toFixed(2)})`,
    });

    // Try to place order with provider API if service has provider mapping
    let providerOrderId: string | null = null;

    if (service.provider_id && service.provider_service_id) {
      const { data: provider } = await adminClient
        .from("providers")
        .select("*")
        .eq("id", service.provider_id)
        .eq("status", "active")
        .single();

      if (provider) {
        try {
          const formData = new URLSearchParams();
          formData.append("key", provider.api_key);
          formData.append("action", "add");
          formData.append("service", service.provider_service_id);
          formData.append("link", link);
          formData.append("quantity", String(quantity));

          const apiRes = await fetch(provider.api_url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
          });

          const apiResult = await apiRes.json();
          if (apiResult.order) {
            providerOrderId = String(apiResult.order);
          }
        } catch (e) {
          console.error("Provider API error:", e);
        }
      }
    }

    // Create order record with exact charge amount
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        user_id: user.id,
        service_id: public_service_id,
        link,
        quantity,
        amount: totalCharge,
        status: providerOrderId ? "processing" : "pending",
        provider_order_id: providerOrderId,
      })
      .select("id")
      .single();

    if (orderError) {
      return new Response(JSON.stringify({ error: orderError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        provider_order_id: providerOrderId,
        charged: totalCharge,
        currency: currencyLabel,
        new_balance: newBalance,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
