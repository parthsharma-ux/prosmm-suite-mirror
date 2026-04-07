import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Link as LinkIcon, Hash, Zap, Search, ChevronRight, Info, Package } from "lucide-react";
import type { Tables } from "@/types/database";

type PublicService = Tables<"public_services">;
type Category = Tables<"categories">;

export default function UserServices() {
  const { user, profile, refreshProfile } = useAuth();
  const { currency } = useCurrency();
  const walletCurrency = profile?.wallet_currency; // "INR" | "USDT" | null
  // Use wallet_currency if locked, otherwise use toggle currency
  const activeCurrency = walletCurrency || currency;

  const getRate = (s: PublicService) => {
    if (activeCurrency === "INR") return s.rate_inr;
    return s.rate_usdt || s.rate;
  };
  const rateSymbol = activeCurrency === "INR" ? "₹" : "$";
  const formatRate = (v: number, decimals = 2) => `${rateSymbol}${v.toFixed(decimals)}`;
  const [services, setServices] = useState<PublicService[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const [s, c] = await Promise.all([
        supabase.from("public_services").select("*").eq("status", "active").order("name"),
        supabase.from("categories").select("*").order("name"),
      ]);
      setServices(s.data || []);
      setCategories(c.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredServices = services.filter((s) => {
    const matchesCategory = !selectedCategory || s.category_id === selectedCategory;
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.provider_service_id && s.provider_service_id.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  const service = services.find((s) => s.id === selectedService);
  const activeRate = service ? getRate(service) : 0;
  const totalCharge = service ? (activeRate / 1000) * quantity : 0;

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !service) return;
    if (quantity < service.min_quantity || quantity > service.max_quantity) { toast.error(`Quantity must be between ${service.min_quantity} and ${service.max_quantity}`); return; }
    if (!link.trim()) { toast.error("Link or username is required"); return; }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please login again"); setSubmitting(false); return; }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/place-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ public_service_id: service.id, link: link.trim() || "", quantity }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed to place order");
      else {
        toast.success(data.provider_order_id ? `Order placed & sent to provider! ID: ${data.provider_order_id}` : `Order placed! Charged: ${data.currency === "INR" ? "₹" : "$"}${data.charged?.toFixed(2)}`);
        setLink(""); setQuantity(0); setSelectedService(""); setSelectedCategory(""); setSearchQuery("");
        // Immediately refresh balance
        await refreshProfile();
      }
    } catch { toast.error("Network error"); }
    setSubmitting(false);
  };

  const getCategoryName = (id: string | null) => categories.find((c) => c.id === id)?.name || "";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-[1.75rem]">New Order</h1>
        <p className="page-subtitle font-medium">Select a service and place your order</p>
      </div>

      <form onSubmit={handleOrder} className="space-y-5">
        {/* Category & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="ecom-card p-5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 block">Category</Label>
            <Select value={selectedCategory || "__all__"} onValueChange={(v) => { setSelectedCategory(v === "__all__" ? "" : v); setSelectedService(""); }}>
              <SelectTrigger className="w-full h-11 rounded-lg">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="ecom-card p-5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name or service ID…"
                className="pl-10 h-11 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Service Selector */}
        <div className="ecom-card p-5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Service
          </Label>
          <Select value={selectedService || "__none__"} onValueChange={(v) => { const id = v === "__none__" ? "" : v; setSelectedService(id); const s = services.find((x) => x.id === id); if (s) setQuantity(s.min_quantity); }}>
            <SelectTrigger className="w-full h-11 rounded-lg overflow-hidden">
              <SelectValue placeholder="Select a service">
                {service && (
                  <span className="truncate block text-left max-w-full">
                    <span className="text-primary font-extrabold mr-1.5 text-xs">#{service.provider_service_id || "N/A"}</span>
                    <span className="truncate text-sm font-semibold">{service.name}</span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-72 overflow-x-hidden" style={{ width: 'var(--radix-select-trigger-width)', maxWidth: 'calc(100vw - 2rem)' }}>
              <SelectItem value="__none__">Select a service</SelectItem>
              {filteredServices.map((s) => (
                <SelectItem key={s.id} value={s.id} className="py-3 px-3">
                  <div className="w-full box-border overflow-hidden">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="shrink-0 text-[11px] font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded">#{s.provider_service_id || "N/A"}</span>
                      <span className="text-sm font-semibold break-words" style={{ overflowWrap: "anywhere", whiteSpace: "normal", lineHeight: "1.4" }}>{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5 ml-0.5">
                      <span className="font-extrabold text-foreground">{formatRate(getRate(s), 2)}/1K</span>
                      <span className="text-muted-foreground">Min: {s.min_quantity}</span>
                      <span className="text-muted-foreground">Max: {s.max_quantity}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Service Detail Card */}
        {service && (
          <div className="ecom-card-highlight p-5">
            <div className="flex items-start gap-4 min-w-0 w-full">
              <div className="p-2.5 rounded-xl bg-primary/10 mt-0.5 shrink-0">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-primary/10 text-primary border-0">
                      #{service.provider_service_id || "N/A"}
                    </Badge>
                    {getCategoryName(service.category_id) && (
                      <span className="text-[10px] text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-md">{getCategoryName(service.category_id)}</span>
                    )}
                  </div>
                  <p className="font-bold text-sm text-foreground leading-snug" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{service.name}</p>
                </div>
                {service.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{service.description}</p>
                )}
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    <span className="font-extrabold text-foreground">{formatRate(getRate(service), 2)}/1K</span>
                  </div>
                  <div className="h-3.5 w-px bg-border" />
                  <span className="text-[11px] text-muted-foreground">Min: <span className="font-medium text-foreground">{service.min_quantity}</span></span>
                  <span className="text-[11px] text-muted-foreground">Max: <span className="font-medium text-foreground">{service.max_quantity}</span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Link Input */}
        <div className="ecom-card p-5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
            <LinkIcon className="h-3.5 w-3.5" /> Link / @Username
          </Label>
          <Input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://example.com/post or @username"
            required
            className="h-11 rounded-lg"
          />
          <p className="text-[10px] text-muted-foreground mt-2">Enter a URL link or @username depending on the service</p>
        </div>

        {/* Quantity & Charge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="ecom-card p-5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" /> Quantity
            </Label>
            <Input
              type="number"
              value={quantity || ""}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={service?.min_quantity || 1}
              max={service?.max_quantity || 10000}
              required
              placeholder={service ? `${service.min_quantity} – ${service.max_quantity}` : "0"}
              className="h-11 rounded-lg"
            />
          </div>
          <div className="ecom-card p-5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 block">Total Charge</Label>
            <div className="flex items-center h-11 rounded-lg border border-border bg-muted/50 px-4">
              <span className="text-lg font-extrabold text-foreground">{formatRate(totalCharge, 4)}</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 font-bold text-sm rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
          disabled={submitting || !selectedService}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Placing order…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Place Order
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}
