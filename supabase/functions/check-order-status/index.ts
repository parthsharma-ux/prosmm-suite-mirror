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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get all orders that are pending or processing (not final states)
    const { data: orders, error: ordersError } = await adminClient
      .from("orders")
      .select("id, provider_order_id, service_id, status")
      .in("status", ["pending", "processing", "partial"])
      .not("provider_order_id", "is", null);

    if (ordersError || !orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ message: "No orders to check", checked: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group orders by provider (via service -> provider mapping)
    const serviceIds = [...new Set(orders.map((o) => o.service_id).filter(Boolean))];

    const { data: services } = await adminClient
      .from("public_services")
      .select("id, provider_id")
      .in("id", serviceIds);

    const providerIds = [...new Set((services || []).map((s) => s.provider_id).filter(Boolean))];

    const { data: providers } = await adminClient
      .from("providers")
      .select("*")
      .in("id", providerIds)
      .eq("status", "active");

    if (!providers || providers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active providers found", checked: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build lookup maps
    const serviceToProvider = new Map<string, string>();
    (services || []).forEach((s) => {
      if (s.provider_id) serviceToProvider.set(s.id, s.provider_id);
    });

    const providerMap = new Map<string, typeof providers[0]>();
    providers.forEach((p) => providerMap.set(p.id, p));

    // Group provider_order_ids by provider
    const providerOrders = new Map<string, { orderId: string; providerOrderId: string }[]>();
    for (const order of orders) {
      if (!order.service_id || !order.provider_order_id) continue;
      const providerId = serviceToProvider.get(order.service_id);
      if (!providerId) continue;
      if (!providerOrders.has(providerId)) providerOrders.set(providerId, []);
      providerOrders.get(providerId)!.push({
        orderId: order.id,
        providerOrderId: order.provider_order_id,
      });
    }

    let updated = 0;

    // Query each provider API for order statuses
    for (const [providerId, orderList] of providerOrders) {
      const provider = providerMap.get(providerId);
      if (!provider) continue;

      // Query status for each order (most SMM APIs support multi-order status)
      const providerOrderIds = orderList.map((o) => o.providerOrderId).join(",");

      try {
        const formData = new URLSearchParams();
        formData.append("key", provider.api_key);
        formData.append("action", "status");
        formData.append("orders", providerOrderIds);

        const apiRes = await fetch(provider.api_url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });

        const apiResult = await apiRes.json();

        // API returns object keyed by order ID
        for (const orderItem of orderList) {
          const statusData = apiResult[orderItem.providerOrderId];
          if (!statusData) continue;

          let newStatus: string | null = null;
          const apiStatus = (statusData.status || "").toLowerCase();

          if (apiStatus === "completed") newStatus = "completed";
          else if (apiStatus === "partial") newStatus = "partial";
          else if (apiStatus === "canceled" || apiStatus === "cancelled") newStatus = "cancelled";
          else if (apiStatus === "refunded") newStatus = "cancelled";
          else if (apiStatus === "in progress" || apiStatus === "inprogress") newStatus = "processing";
          else if (apiStatus === "pending") newStatus = "pending";
          else if (apiStatus === "error" || apiStatus === "fail") newStatus = "failed";

          if (newStatus) {
            const { error: updateError } = await adminClient
              .from("orders")
              .update({ status: newStatus })
              .eq("id", orderItem.orderId);

            if (!updateError) updated++;
          }
        }
      } catch (e) {
        console.error(`Error checking provider ${providerId}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ message: "Status check complete", checked: orders.length, updated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
