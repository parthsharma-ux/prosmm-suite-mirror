import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RefreshCw, Loader2 } from "lucide-react";
import type { Tables } from "@/types/database";

type Provider = Tables<"providers">;

export default function AdminProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", api_url: "", api_key: "", currency: "USD", priority: 1 });

  const fetchProviders = async () => {
    const { data } = await supabase.from("providers").select("*").order("priority");
    setProviders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProviders(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", api_url: "", api_key: "", currency: "USD", priority: 1 });
    setDialogOpen(true);
  };

  const openEdit = (p: Provider) => {
    setEditing(p);
    setForm({ name: p.name, api_url: p.api_url, api_key: p.api_key, currency: p.currency, priority: p.priority });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.api_url || !form.api_key) { toast.error("Fill all required fields"); return; }
    if (editing) {
      const { error } = await supabase.from("providers").update(form).eq("id", editing.id);
      if (error) toast.error(error.message); else { toast.success("Provider updated"); setDialogOpen(false); fetchProviders(); }
    } else {
      const { error } = await supabase.from("providers").insert(form);
      if (error) toast.error(error.message); else { toast.success("Provider added"); setDialogOpen(false); fetchProviders(); }
    }
  };

  const toggleStatus = async (p: Provider) => {
    await supabase.from("providers").update({ status: !p.status }).eq("id", p.id);
    fetchProviders();
  };

  const deleteProvider = async (id: string) => {
    if (!confirm("Delete this provider?")) return;
    await supabase.from("providers").delete().eq("id", id);
    toast.success("Provider deleted");
    fetchProviders();
  };

  const syncServices = async (providerId: string) => {
    setSyncing(providerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sync-provider-services`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ provider_id: providerId }) }
      );
      const result = await res.json();
      if (result.error) toast.error(result.error);
      else toast.success(`Synced! New: ${result.synced}, Updated: ${result.updated}, Total: ${result.total}`);
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncing(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Providers</h2>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Provider</Button>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>API URL</TableHead><TableHead>Currency</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No providers yet</TableCell></TableRow>}
            {providers.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-48 truncate">{p.api_url}</TableCell>
                <TableCell>{p.currency}</TableCell>
                <TableCell>{p.priority}</TableCell>
                <TableCell><Switch checked={p.status} onCheckedChange={() => toggleStatus(p)} /></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="outline" size="sm" onClick={() => syncServices(p.id)} disabled={syncing === p.id}>
                    {syncing === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}Sync
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteProvider(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Provider" : "Add Provider"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. SMMPanel.co" /></div>
            <div className="space-y-2"><Label>API URL *</Label><Input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} placeholder="https://example.com/api/v2" /></div>
            <div className="space-y-2"><Label>API Key *</Label><Input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} type="password" placeholder="Your API key" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem><SelectItem value="INR">INR</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Priority</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></div>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add"} Provider</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
