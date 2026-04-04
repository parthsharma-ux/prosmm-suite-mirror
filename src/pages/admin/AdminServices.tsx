import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Package, Zap } from "lucide-react";
import type { Tables } from "@/types/database";

type Service = Tables<"public_services">;
type Category = Tables<"categories">;
type Provider = Tables<"providers">;

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ category_id: "", name: "", description: "", rate: 0, rate_inr: 0, rate_usdt: 0, min_quantity: 1, max_quantity: 10000, provider_id: "", provider_service_id: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [exchangeRate, setExchangeRate] = useState(110);

  const fetchData = async () => {
    const [s, c, p] = await Promise.all([
      supabase.from("public_services").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("providers").select("*").eq("status", "active").order("name"),
    ]);
    setServices(s.data || []);
    setCategories(c.data || []);
    setProviders(p.data || []);
    // Fetch exchange rate
    const { data: psData } = await supabase.from("payment_settings").select("method, details").eq("method", "exchange_rate");
    if (psData && psData[0]) {
      const details = psData[0].details as Record<string, string> || {};
      const rate = parseFloat(details.rate);
      if (!isNaN(rate) && rate > 0) setExchangeRate(rate);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => { setEditing(null); setForm({ category_id: "", name: "", description: "", rate: 0, rate_inr: 0, rate_usdt: 0, min_quantity: 1, max_quantity: 10000, provider_id: "", provider_service_id: "" }); setDialogOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); setForm({ category_id: s.category_id || "", name: s.name, description: s.description || "", rate: Number(s.rate), rate_inr: Number(s.rate_inr), rate_usdt: Number(s.rate_usdt), min_quantity: s.min_quantity, max_quantity: s.max_quantity, provider_id: s.provider_id || "", provider_service_id: s.provider_service_id || "" }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    const rateUsdt = Number(form.rate_usdt) || Number(form.rate);
    const rateInr = Number(form.rate_inr) || (rateUsdt * exchangeRate);
    const payload = {
      category_id: form.category_id || null, name: form.name, description: form.description || null,
      rate: Number(form.rate), rate_usdt: rateUsdt, rate_inr: rateInr,
      min_quantity: Number(form.min_quantity), max_quantity: Number(form.max_quantity),
      provider_id: form.provider_id || null, provider_service_id: form.provider_service_id || null,
    };
    if (editing) {
      const { error } = await supabase.from("public_services").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message); else { toast.success("Updated"); setDialogOpen(false); fetchData(); }
    } else {
      const { error } = await supabase.from("public_services").insert(payload);
      if (error) toast.error(error.message); else { toast.success("Created"); setDialogOpen(false); fetchData(); }
    }
  };

  const toggle = async (s: Service) => { await supabase.from("public_services").update({ status: s.status === "active" ? "inactive" : "active" }).eq("id", s.id); fetchData(); };
  const del = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("public_services").delete().eq("id", id); toast.success("Deleted"); fetchData(); };
  const getCategoryName = (id: string | null) => categories.find((c) => c.id === id)?.name || "—";
  const getProviderName = (id: string | null) => providers.find((p) => p.id === id)?.name || "";

  const filteredServices = services.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.provider_service_id && s.provider_service_id.includes(searchQuery));
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Public Services</h1>
          <p className="page-subtitle">Manage your service catalog</p>
        </div>
        <Button size="sm" onClick={openAdd} className="font-semibold rounded-lg shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-1" /> Add Service
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or service ID..." className="pl-10 h-11 rounded-lg" />
      </div>

      {filteredServices.length === 0 ? (
        <div className="ecom-card p-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No services found</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map((s) => (
            <div key={s.id} className="ecom-card-interactive p-5">
              <div className="flex items-start justify-between mb-3">
                <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border-0">
                  #{s.provider_service_id || "N/A"}
                </Badge>
                <Switch checked={s.status === "active"} onCheckedChange={() => toggle(s)} />
              </div>

              <h3 className="font-semibold text-sm text-foreground leading-snug mb-1 line-clamp-2">{s.name}</h3>
              {s.description && <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">{s.description}</p>}

              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-medium">{getCategoryName(s.category_id)}</span>
                {getProviderName(s.provider_id) && <span className="text-[10px]">{getProviderName(s.provider_id)}</span>}
              </div>

              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border flex-wrap">
                <div className="flex items-center gap-1 text-xs">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="font-bold text-foreground">${s.rate_usdt}</span>
                  <span className="text-muted-foreground">/1K</span>
                </div>
                <span className="text-[10px] text-muted-foreground">₹{s.rate_inr}/1K</span>
                <span className="text-[10px] text-muted-foreground">Min: {s.min_quantity} | Max: {s.max_quantity}</span>
              </div>

              <div className="flex items-center gap-1 mt-3">
                <Button variant="outline" size="sm" onClick={() => openEdit(s)} className="flex-1 h-8 text-xs rounded-lg">
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="icon" onClick={() => del(s.id)} className="h-8 w-8 shrink-0">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-bold">{editing ? "Edit" : "Add"} Service</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 rounded-lg" /></div>
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="rounded-lg" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate USDT ($)</Label><Input type="number" step="0.01" value={form.rate_usdt} onChange={(e) => { const v = Number(e.target.value); setForm({ ...form, rate_usdt: v, rate: v, rate_inr: parseFloat((v * exchangeRate).toFixed(2)) }); }} className="h-11 rounded-lg" /></div>
              <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate INR (₹)</Label><Input type="number" step="0.01" value={form.rate_inr} onChange={(e) => setForm({ ...form, rate_inr: Number(e.target.value) })} className="h-11 rounded-lg" /></div>
              <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate Base ($)</Label><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} className="h-11 rounded-lg" /></div>
            </div>
            <p className="text-[10px] text-muted-foreground -mt-2">INR auto-calculated from USDT × {exchangeRate}. You can override INR manually.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Min</Label><Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: Number(e.target.value) })} className="h-11 rounded-lg" /></div>
              <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max</Label><Input type="number" value={form.max_quantity} onChange={(e) => setForm({ ...form, max_quantity: Number(e.target.value) })} className="h-11 rounded-lg" /></div>
            </div>
            <div className="border-t border-border pt-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Provider Mapping</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider</Label>
                  <Select value={form.provider_id} onValueChange={(v) => setForm({ ...form, provider_id: v === "__none__" ? "" : v })}>
                    <SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider Service ID</Label>
                  <Input value={form.provider_service_id} onChange={(e) => setForm({ ...form, provider_service_id: e.target.value })} placeholder="e.g. 8221" className="h-11 rounded-lg" />
                </div>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full font-semibold rounded-xl">{editing ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
