import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import type { Tables } from "@/types/database";

type Service = Tables<"public_services">;
type Category = Tables<"categories">;

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ category_id: "", name: "", description: "", rate: 0, min_quantity: 1, max_quantity: 10000 });
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    const [s, c] = await Promise.all([
      supabase.from("public_services").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
    ]);
    setServices(s.data || []);
    setCategories(c.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => { setEditing(null); setForm({ category_id: "", name: "", description: "", rate: 0, min_quantity: 1, max_quantity: 10000 }); setDialogOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); setForm({ category_id: s.category_id || "", name: s.name, description: s.description || "", rate: Number(s.rate), min_quantity: s.min_quantity, max_quantity: s.max_quantity }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    const payload = { ...form, category_id: form.category_id || null, rate: Number(form.rate), min_quantity: Number(form.min_quantity), max_quantity: Number(form.max_quantity) };
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

  const filteredServices = services.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) ||
      (s.provider_service_id && s.provider_service_id.includes(searchQuery)) ||
      s.id.includes(searchQuery);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Public Services</h2>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Service</Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or service ID..." className="pl-9" />
      </div>
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Service ID</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Rate</TableHead>
              <TableHead className="font-semibold">Min/Max</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServices.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No services</TableCell></TableRow>}
            {filteredServices.map((s) => (
              <TableRow key={s.id} className="group hover:bg-muted/20 transition-colors">
                <TableCell>
                  <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 rounded bg-primary/10 text-primary border-0">
                    #{s.provider_service_id || s.id.slice(0, 6)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="min-w-0 max-w-64">
                    <p className="font-bold text-sm whitespace-normal break-words leading-tight">{s.name}</p>
                    {s.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>}
                  </div>
                </TableCell>
                <TableCell><span className="font-medium text-xs">{getCategoryName(s.category_id)}</span></TableCell>
                <TableCell><span className="font-semibold">${s.rate}</span></TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.min_quantity} / {s.max_quantity}</TableCell>
                <TableCell><Switch checked={s.status === "active"} onCheckedChange={() => toggle(s)} /></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-bold">{editing ? "Edit" : "Add"} Service</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase tracking-wider">Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="font-semibold text-xs uppercase tracking-wider">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label className="font-semibold text-xs uppercase tracking-wider">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label className="font-semibold text-xs uppercase tracking-wider">Rate ($)</Label><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label className="font-semibold text-xs uppercase tracking-wider">Min</Label><Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label className="font-semibold text-xs uppercase tracking-wider">Max</Label><Input type="number" value={form.max_quantity} onChange={(e) => setForm({ ...form, max_quantity: Number(e.target.value) })} /></div>
            </div>
            <Button onClick={handleSave} className="w-full font-semibold">{editing ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
