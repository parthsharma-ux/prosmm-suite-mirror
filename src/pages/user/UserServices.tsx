import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Link as LinkIcon, Hash, Zap, Search, ChevronRight, Sparkles } from "lucide-react";
import type { Tables } from "@/types/database";

type PublicService = Tables<"public_services">;
type Category = Tables<"categories">;

export default function UserServices() {
  const { user } = useAuth();
  const { format } = useCurrency();
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
  const totalCharge = service ? (service.rate / 1000) * quantity : 0;

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
        toast.success(data.provider_order_id ? `Order placed & sent to provider! ID: ${data.provider_order_id}` : "Order placed successfully!");
        setLink(""); setQuantity(0); setSelectedService(""); setSelectedCategory(""); setSearchQuery("");
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
    <div className="w-full max-w-2xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">New Order</h1>
            <p className="text-xs text-muted-foreground">Select a service and place your order</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleOrder} className="space-y-4">
        {/* Category & Search Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden animate-slide-up" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
            <CardContent className="p-4">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2 block">Category</Label>
              <Select value={selectedCategory || "__all__"} onValueChange={(v) => { setSelectedCategory(v === "__all__" ? "" : v); setSelectedService(""); }}>
                <SelectTrigger className="w-full h-10 border-border/50 bg-background/50 hover:bg-background transition-colors">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}><span className="font-medium">{c.name}</span></SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            <CardContent className="p-4">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name or service ID…"
                  className="pl-9 h-10 border-border/50 bg-background/50 hover:bg-background transition-colors"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service Selector */}
        <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden animate-slide-up" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
          <CardContent className="p-4">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2 block">Service</Label>
            <Select value={selectedService || "__none__"} onValueChange={(v) => { const id = v === "__none__" ? "" : v; setSelectedService(id); const s = services.find((x) => x.id === id); if (s) setQuantity(s.min_quantity); }}>
              <SelectTrigger className="w-full h-10 border-border/50 bg-background/50 hover:bg-background transition-colors overflow-hidden">
                <SelectValue placeholder="Select a service">
                  {service && (
                    <span className="truncate block text-left max-w-full">
                      <span className="text-primary font-bold mr-1.5 text-xs">#{service.provider_service_id || "N/A"}</span>
                      <span className="truncate text-sm">{service.name}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72 overflow-x-hidden" style={{ width: 'var(--radix-select-trigger-width)', maxWidth: 'calc(100vw - 2rem)' }}>
                <SelectItem value="__none__">Select a service</SelectItem>
                {filteredServices.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="py-2.5 px-2">
                    <div className="w-full box-border overflow-hidden">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <span className="shrink-0 text-[11px] font-bold text-primary">#{s.provider_service_id || "N/A"}</span>
                        <span className="text-sm font-medium break-words" style={{ overflowWrap: "anywhere", whiteSpace: "normal", lineHeight: "1.4" }}>{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-1">
                        <span className="font-semibold text-foreground">{format(s.rate, 2)}/1K</span>
                        <span className="opacity-60">Min: {s.min_quantity}</span>
                        <span className="opacity-60">Max: {s.max_quantity}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Selected Service Detail */}
        {service && (
          <Card className="border-primary/20 shadow-md bg-gradient-to-br from-primary/[0.04] to-primary/[0.08] backdrop-blur-sm overflow-hidden animate-enter transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 min-w-0 w-full">
                <div className="p-1.5 rounded-lg bg-primary/10 mt-0.5 shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 rounded-md bg-primary/10 text-primary border-0">
                        #{service.provider_service_id || "N/A"}
                      </Badge>
                      {getCategoryName(service.category_id) && (
                        <span className="text-[10px] text-muted-foreground font-medium">{getCategoryName(service.category_id)}</span>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-foreground leading-snug" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{service.name}</p>
                  </div>
                  {service.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{service.description}</p>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Zap className="h-3 w-3 text-primary" />
                      <span className="font-bold text-foreground">{format(service.rate, 2)}/1K</span>
                    </div>
                    <div className="h-3 w-px bg-border" />
                    <span className="text-[11px] text-muted-foreground">Min: <span className="font-medium text-foreground">{service.min_quantity}</span></span>
                    <span className="text-[11px] text-muted-foreground">Max: <span className="font-medium text-foreground">{service.max_quantity}</span></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Link Input */}
        <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <CardContent className="p-4">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2 flex items-center gap-1.5">
              <LinkIcon className="h-3 w-3" /> Link / @Username
            </Label>
            <Input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com/post or @username"
              required
              className="h-10 border-border/50 bg-background/50 hover:bg-background transition-colors"
            />
            <p className="text-[10px] text-muted-foreground/60 mt-1.5">Enter a URL link or @username depending on the service</p>
          </CardContent>
        </Card>

        {/* Quantity & Charge */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-4">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2 flex items-center gap-1.5">
                <Hash className="h-3 w-3" /> Quantity
              </Label>
              <Input
                type="number"
                value={quantity || ""}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={service?.min_quantity || 1}
                max={service?.max_quantity || 10000}
                required
                placeholder={service ? `${service.min_quantity} – ${service.max_quantity}` : "0"}
                className="h-10 border-border/50 bg-background/50 hover:bg-background transition-colors"
              />
            </CardContent>
          </Card>
          <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-4">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2 block">Total Charge</Label>
              <div className="flex items-center h-10 rounded-md border border-border/50 bg-background/50 px-3">
                <span className="text-sm font-bold text-foreground">{format(totalCharge, 4)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 font-semibold text-sm rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-200 group"
          disabled={submitting || !selectedService}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Placing order…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Place Order
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}
