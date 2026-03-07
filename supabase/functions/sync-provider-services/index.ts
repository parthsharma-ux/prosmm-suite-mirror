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

    // Verify user is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
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

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider_id } = await req.json();
    if (!provider_id) {
      return new Response(JSON.stringify({ error: "provider_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get provider
    const { data: provider, error: provError } = await adminClient
      .from("providers")
      .select("*")
      .eq("id", provider_id)
      .single();

    if (provError || !provider) {
      return new Response(JSON.stringify({ error: "Provider not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch services from provider API
    const apiUrl = provider.api_url;
    const apiKey = provider.api_key;

    const formData = new URLSearchParams();
    formData.append("key", apiKey);
    formData.append("action", "services");

    const apiRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!apiRes.ok) {
      return new Response(
        JSON.stringify({ error: `Provider API error: ${apiRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const providerServices = await apiRes.json();

    if (!Array.isArray(providerServices)) {
      return new Response(
        JSON.stringify({ error: "Invalid response from provider API", raw: providerServices }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing services for this provider
    const { data: existingServices } = await adminClient
      .from("public_services")
      .select("id, provider_service_id")
      .eq("provider_id", provider_id);

    const existingMap = new Map(
      (existingServices || []).map((s) => [s.provider_service_id, s.id])
    );

    let synced = 0;
    let updated = 0;

    // Get or create categories
    const categoryMap = new Map<string, string>();
    const { data: existingCategories } = await adminClient
      .from("categories")
      .select("id, name");
    for (const cat of existingCategories || []) {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    }

    for (const svc of providerServices) {
      const serviceId = String(svc.service);
      const name = svc.name || `Service ${serviceId}`;
      const rate = parseFloat(svc.rate) || 0;
      const minQty = parseInt(svc.min) || 1;
      const maxQty = parseInt(svc.max) || 10000;
      const categoryName = svc.category || "Uncategorized";
      const description = svc.description || null;

      // Get or create category
      let categoryId = categoryMap.get(categoryName.toLowerCase());
      if (!categoryId) {
        const { data: newCat } = await adminClient
          .from("categories")
          .insert({ name: categoryName })
          .select("id")
          .single();
        if (newCat) {
          categoryId = newCat.id;
          categoryMap.set(categoryName.toLowerCase(), categoryId);
        }
      }

      if (existingMap.has(serviceId)) {
        // Update existing
        await adminClient
          .from("public_services")
          .update({
            name,
            rate,
            min_quantity: minQty,
            max_quantity: maxQty,
            category_id: categoryId || null,
            description,
          })
          .eq("id", existingMap.get(serviceId)!);
        updated++;
      } else {
        // Insert new
        await adminClient.from("public_services").insert({
          name,
          rate,
          min_quantity: minQty,
          max_quantity: maxQty,
          provider_id,
          provider_service_id: serviceId,
          category_id: categoryId || null,
          status: "active",
          description,
        });
        synced++;
      }
    }

    return new Response(
      JSON.stringify({ synced, updated, total: providerServices.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
