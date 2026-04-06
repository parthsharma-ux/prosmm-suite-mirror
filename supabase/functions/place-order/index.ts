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

    // Determine rate and currency based on user's locked wallet currency
    // NO cross-currency conversion — deduct exact amount in user's currency
    const isINR = profile.wallet_currency === "INR";
    const rate = isINR ? service.rate_inr : service.rate_usdt;
    const currencyLabel = isINR ? "INR" : "USDT";
    const currencySymbol = isINR ? "₹" : "$";

    // Calculate exact charge: rate is per 1000, use precise math
    // Round to 4 decimal places to avoid floating point drift
    const exactCharge = Math.round((rate / 1000) * quantity * 10000) / 10000;

    console.log(`[place-order] user=${user.id} currency=${currencyLabel} rate=${rate} qty=${quantity} exactCharge=${exactCharge} walletBalance=${profile.wallet_balance}`);

    // Check balance — direct comparison, no conversion
    if (profile.wallet_balance < exactCharge) {
      return new Response(JSON.stringify({
        error: `Insufficient balance. Need ${currencySymbol}${exactCharge.toFixed(2)}, available: ${currencySymbol}${profile.wallet_balance.toFixed(2)}`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct exact charge from wallet — same currency, no conversion
    const newBalance = Math.round((profile.wallet_balance - exactCharge) * 10000) / 10000;

    console.log(`[place-order] deducting ${exactCharge} ${currencyLabel}, newBalance=${newBalance}`);

    await adminClient
      .from("profiles")
      .update({ wallet_balance: newBalance })
      .eq("user_id", user.id);

    // Record transaction with exact amount in user's currency
    await adminClient.from("transactions").insert({
      user_id: user.id,
      amount: -exactCharge,
      type: "order",
      description: `Order: ${service.name} x${quantity} (${currencySymbol}${exactCharge.toFixed(2)} ${currencyLabel})`,
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

    // Create order record with exact charge in user's currency
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        user_id: user.id,
        service_id: public_service_id,
        link,
        quantity,
        amount: exactCharge,
        status: providerOrderId ? "processing" : "pending",
        provider_order_id: providerOrderId,
      })
      .select("id")
      .single();

    if (orderError) {
      // Refund on order creation failure
      console.error(`[place-order] order insert failed, refunding ${exactCharge} to user ${user.id}`);
      await adminClient
        .from("profiles")
        .update({ wallet_balance: profile.wallet_balance })
        .eq("user_id", user.id);
      return new Response(JSON.stringify({ error: orderError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[place-order] success orderId=${order.id} charged=${exactCharge} ${currencyLabel} newBalance=${newBalance}`);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        provider_order_id: providerOrderId,
        charged: exactCharge,
        currency: currencyLabel,
        new_balance: newBalance,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[place-order] unexpected error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
