import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
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
  const [form, setForm] = useState({ category_id: "", name: "", description: "", rate: 0, min_quantity: 1, max_quantity: 10000, provider_id: "", provider_service_id: "" });
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    const [s, c, p] = await Promise.all([
      supabase.from("public_services").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("providers").select("*").eq("status", "active").order("name"),
    ]);
    setServices(s.data || []);
    setCategories(c.data || []);
    setProviders(p.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => { setEditing(null); setForm({ category_id: "", name: "", description: "", rate: 0, min_quantity: 1, max_quantity: 10000, provider_id: "", provider_service_id: "" }); setDialogOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); setForm({ category_id: s.category_id || "", name: s.name, description: s.description || "", rate: Number(s.rate), min_quantity: s.min_quantity, max_quantity: s.max_quantity, provider_id: s.provider_id || "", provider_service_id: s.provider_service_id || "" }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    const payload = {
      category_id: form.category_id || null, name: form.name, description: form.description || null,
      rate: Number(form.rate), min_quantity: Number(form.min_quantity), max_quantity: Number(form.max_quantity),
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
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Public Services</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your service catalog</p>
        </div>
        <Button size="sm" onClick={openAdd} className="font-semibold"><Plus className="h-4 w-4 mr-1" /> Add Service</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or service ID..." className="pl-9 h-10" />
      </div>

      <Card className="border-border bg-card overflow-hidden">
        <div className="table-wrapper">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-xs">Service ID</TableHead>
                <TableHead className="font-semibold text-xs">Name</TableHead>
                <TableHead className="font-semibold text-xs">Category</TableHead>
                <TableHead className="font-semibold text-xs">Provider</TableHead>
                <TableHead className="font-semibold text-xs">Rate</TableHead>
                <TableHead className="font-semibold text-xs">Min/Max</TableHead>
                <TableHead className="font-semibold text-xs">Status</TableHead>
                <TableHead className="text-right font-semibold text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No services</TableCell></TableRow>}
              {filteredServices.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 rounded bg-primary/10 text-primary border-0">
                      {s.provider_service_id ? `#${s.provider_service_id}` : "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0 max-w-64">
                      <p className="font-semibold text-sm whitespace-normal break-words leading-tight">{s.name}</p>
                      {s.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell><span className="font-medium text-xs">{getCategoryName(s.category_id)}</span></TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{getProviderName(s.provider_id) || "—"}</span></TableCell>
                  <TableCell><span className="font-semibold">${s.rate}</span></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.min_quantity} / {s.max_quantity}</TableCell>
                  <TableCell><Switch checked={s.status === "active"} onCheckedChange={() => toggle(s)} /></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => del(s.id)} className="h-8 w-8"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-bold">{editing ? "Edit" : "Add"} Service</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10" /></div>
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate ($)</Label><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} className="h-10" /></div>
              <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Min</Label><Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: Number(e.target.value) })} className="h-10" /></div>
              <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max</Label><Input type="number" value={form.max_quantity} onChange={(e) => setForm({ ...form, max_quantity: Number(e.target.value) })} className="h-10" /></div>
            </div>
            <div className="border-t border-border pt-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Provider Mapping</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider</Label>
                  <Select value={form.provider_id} onValueChange={(v) => setForm({ ...form, provider_id: v === "__none__" ? "" : v })}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider Service ID</Label>
                  <Input value={form.provider_service_id} onChange={(e) => setForm({ ...form, provider_service_id: e.target.value })} placeholder="e.g. 8221" className="h-10" />
                </div>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full font-semibold">{editing ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
