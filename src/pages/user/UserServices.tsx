import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Link as LinkIcon, Hash, Zap, Search } from "lucide-react";
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in duration-300">
      <Card className="border-border/50 shadow-md bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10"><ShoppingCart className="h-4 w-4 text-primary" /></div>
            <CardTitle className="text-lg font-bold">New Order</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleOrder} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select value={selectedCategory || "__all__"} onValueChange={(v) => { setSelectedCategory(v === "__all__" ? "" : v); setSelectedService(""); }}>
                <SelectTrigger className="w-full h-11"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}><span className="font-medium">{c.name}</span></SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or service ID..."
                  className="pl-9 h-11 mb-2"
                />
              </div>
              <Select value={selectedService || "__none__"} onValueChange={(v) => { const id = v === "__none__" ? "" : v; setSelectedService(id); const s = services.find((x) => x.id === id); if (s) setQuantity(s.min_quantity); }}>
                <SelectTrigger className="w-full h-11 overflow-hidden">
                  <SelectValue placeholder="Select a service">
                    {service && (
                      <span className="truncate block text-left max-w-full">
                        <span className="text-primary font-bold mr-1">ID: {service.provider_service_id || "N/A"}</span>
                        <span className="truncate">{service.name}</span>
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
                          <span className="shrink-0 text-xs font-bold text-primary">
                            ID: {s.provider_service_id || "N/A"}
                          </span>
                          <span className="text-sm font-semibold break-words" style={{ overflowWrap: "anywhere", whiteSpace: "normal", lineHeight: "1.4" }}>{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                          <span className="font-semibold text-foreground">{format(s.rate, 2)}/1K</span>
                          <span>Min: {s.min_quantity}</span>
                          <span>Max: {s.max_quantity}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {service && (
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 w-full box-border overflow-hidden">
                <div className="flex items-start gap-2 min-w-0 w-full">
                  <Badge variant="secondary" className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border-0 mt-0.5">
                    ID: {service.provider_service_id || "N/A"}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground leading-[1.4]" style={{ wordBreak: "break-word", overflowWrap: "anywhere", whiteSpace: "normal" }}>{service.name}</p>
                    {getCategoryName(service.category_id) && <p className="text-[11px] text-muted-foreground mt-0.5">{getCategoryName(service.category_id)}</p>}
                  </div>
                </div>
                {service.description && <p className="text-[13px] text-muted-foreground leading-[1.4] whitespace-pre-wrap" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{service.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                   <span className="font-semibold text-foreground">{format(service.rate, 2)}/1K</span>
                   <span>Min: {service.min_quantity}</span><span>Max: {service.max_quantity}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><LinkIcon className="h-3 w-3" /> Link</Label>
              <Input type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://example.com/post or @username" required className="w-full h-11" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Hash className="h-3 w-3" /> Quantity</Label>
                <Input type="number" value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))} min={service?.min_quantity || 1} max={service?.max_quantity || 10000} required placeholder={service ? `${service.min_quantity} – ${service.max_quantity}` : ""} className="w-full h-11" />
              </div>
              <div className="space-y-2 min-w-0">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Charge</Label>
                <div className="flex items-center h-11 rounded-md border border-input bg-muted/50 px-3"><span className="text-sm font-bold text-foreground">{format(totalCharge, 4)}</span></div>
              </div>
            </div>
            {service && (
              <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/10 px-4 py-2.5 text-xs animate-in fade-in duration-200">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5"><Zap className="h-3 w-3 text-primary" /> Rate per 1K</span>
                <span className="font-bold text-foreground">{format(service.rate)}</span>
              </div>
            )}
            <Button type="submit" className="w-full h-11 font-semibold text-sm" disabled={submitting || !selectedService}>
              {submitting ? "Placing order…" : "Place Order"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
