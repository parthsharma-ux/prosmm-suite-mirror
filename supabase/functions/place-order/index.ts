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

    // Determine rate based on user's wallet currency
    const { data: profile } = await adminClient
      .from("profiles")
      .select("wallet_balance, wallet_currency")
      .eq("user_id", user.id)
      .single();

    let rateToUse = service.rate; // default USD rate
    let currencyLabel = "USD";
    if (profile?.wallet_currency === "INR") {
      rateToUse = service.rate_inr;
      currencyLabel = "INR";
    } else if (profile?.wallet_currency === "USDT") {
      rateToUse = service.rate_usdt;
      currencyLabel = "USDT";
    }

    const amount = (rateToUse / 1000) * quantity;

    if (!profile || profile.wallet_balance < amount) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct balance
    await adminClient
      .from("profiles")
      .update({ wallet_balance: profile.wallet_balance - amount })
      .eq("user_id", user.id);

    // Record transaction
    await adminClient.from("transactions").insert({
      user_id: user.id,
      amount: -amount,
      type: "order",
      description: `Order: ${service.name} x${quantity}`,
    });

    // Try to place order with provider API if service has provider mapping
    let providerOrderId: string | null = null;

    if (service.provider_id && service.provider_service_id) {
      // Get provider details
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
          // Order still created locally even if provider fails
        }
      }
    }

    // Create order record
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        user_id: user.id,
        service_id: public_service_id,
        link,
        quantity,
        amount,
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
        amount,
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
