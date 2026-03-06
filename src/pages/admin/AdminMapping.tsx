import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { Tables } from "@/types/database";

type ServiceMap = Tables<"service_provider_map">;
type PublicService = Tables<"public_services">;
type ProviderService = Tables<"provider_services">;
type Provider = Tables<"providers">;

export default function AdminMapping() {
  const [mappings, setMappings] = useState<ServiceMap[]>([]);
  const [publicServices, setPublicServices] = useState<PublicService[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderService[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ public_service_id: "", provider_service_id: "", priority: 1, custom_margin: 0, failover_enabled: false });

  const fetchData = async () => {
    const [m, ps, pvs, prov] = await Promise.all([
      supabase.from("service_provider_map").select("*").order("priority"),
      supabase.from("public_services").select("*").order("name"),
      supabase.from("provider_services").select("*").order("name"),
      supabase.from("providers").select("*").order("name"),
    ]);
    setMappings(m.data || []);
    setPublicServices(ps.data || []);
    setProviderServices(pvs.data || []);
    setProviders(prov.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.public_service_id || !form.provider_service_id) { toast.error("Select both services"); return; }
    const { error } = await supabase.from("service_provider_map").insert({ ...form, priority: Number(form.priority), custom_margin: Number(form.custom_margin) });
    if (error) toast.error(error.message); else { toast.success("Mapping added"); setDialogOpen(false); fetchData(); }
  };

  const del = async (id: string) => { if (!confirm("Remove?")) return; await supabase.from("service_provider_map").delete().eq("id", id); fetchData(); };
  const toggleFailover = async (m: ServiceMap) => { await supabase.from("service_provider_map").update({ failover_enabled: !m.failover_enabled }).eq("id", m.id); fetchData(); };
  const getPublicService = (id: string) => publicServices.find((s) => s.id === id);
  const getProviderService = (id: string) => providerServices.find((s) => s.id === id);
  const getProviderName = (providerId: string) => providers.find((p) => p.id === providerId)?.name || "—";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">API Mapping</h2>
        <Button size="sm" onClick={() => { setForm({ public_service_id: "", provider_service_id: "", priority: 1, custom_margin: 0, failover_enabled: false }); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add Mapping</Button>
      </div>
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Panel Service</TableHead><TableHead className="font-semibold">Provider</TableHead><TableHead className="font-semibold">Provider Service</TableHead><TableHead className="font-semibold">Priority</TableHead><TableHead className="font-semibold">Margin</TableHead><TableHead className="font-semibold">Failover</TableHead><TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No mappings</TableCell></TableRow>}
            {mappings.map((m) => {
              const ps = getPublicService(m.public_service_id);
              const pvs = getProviderService(m.provider_service_id);
              return (
                <TableRow key={m.id} className="group hover:bg-muted/20 transition-colors">
                  <TableCell><div className="min-w-0 max-w-48"><Badge variant="secondary" className="shrink-0 text-[10px] font-bold px-1.5 py-0 rounded bg-primary/10 text-primary border-0">{m.public_service_id.slice(0, 6)}</Badge><p className="font-bold text-xs whitespace-normal break-words leading-tight mt-0.5">{ps?.name || m.public_service_id}</p></div></TableCell>
                  <TableCell><span className="font-medium text-xs">{pvs ? getProviderName(pvs.provider_id) : "—"}</span></TableCell>
                  <TableCell><div className="min-w-0 max-w-48"><Badge variant="outline" className="shrink-0 text-[10px] font-bold px-1.5 py-0 rounded">{pvs?.external_service_id || m.provider_service_id.slice(0, 6)}</Badge><p className="text-xs whitespace-normal break-words leading-tight text-muted-foreground mt-0.5">{pvs?.name || m.provider_service_id}</p></div></TableCell>
                  <TableCell><span className="font-semibold">{m.priority}</span></TableCell>
                  <TableCell><span className="font-semibold">{m.custom_margin}%</span></TableCell>
                  <TableCell><Switch checked={m.failover_enabled} onCheckedChange={() => toggleFailover(m)} /></TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => del(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-bold">Add Mapping</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase tracking-wider">Public Service</Label>
              <Select value={form.public_service_id} onValueChange={(v) => setForm({ ...form, public_service_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent className="max-h-60">{publicServices.map((s) => <SelectItem key={s.id} value={s.id}><span className="font-medium text-sm">{s.name}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase tracking-wider">Provider Service</Label>
              <Select value={form.provider_service_id} onValueChange={(v) => setForm({ ...form, provider_service_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent className="max-h-60">{providerServices.map((s) => <SelectItem key={s.id} value={s.id}><span className="font-medium text-sm">{s.name}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="font-semibold text-xs uppercase tracking-wider">Priority</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label className="font-semibold text-xs uppercase tracking-wider">Custom Margin %</Label><Input type="number" step="0.01" value={form.custom_margin} onChange={(e) => setForm({ ...form, custom_margin: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.failover_enabled} onCheckedChange={(v) => setForm({ ...form, failover_enabled: v })} /><Label className="font-medium">Enable Failover</Label></div>
            <Button onClick={handleSave} className="w-full font-semibold">Add Mapping</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
