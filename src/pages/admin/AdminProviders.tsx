import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RefreshCw, Loader2, Server, Globe, Key } from "lucide-react";
import type { Tables } from "@/types/database";

type Provider = Tables<"providers">;

export default function AdminProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", api_url: "", api_key: "" });

  const fetchProviders = async () => {
    const { data } = await supabase.from("providers").select("*").order("name");
    setProviders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProviders(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: "", api_url: "", api_key: "" }); setDialogOpen(true); };
  const openEdit = (p: Provider) => { setEditing(p); setForm({ name: p.name, api_url: p.api_url, api_key: p.api_key }); setDialogOpen(true); };

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
    await supabase.from("providers").update({ status: p.status === "active" ? "inactive" : "active" }).eq("id", p.id);
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Providers</h1>
          <p className="page-subtitle">Manage API providers</p>
        </div>
        <Button size="sm" onClick={openAdd} className="font-semibold rounded-lg shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-1" /> Add Provider
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className="ecom-card p-12 text-center">
          <Server className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No providers yet</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((p) => (
            <div key={p.id} className="ecom-card-interactive p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Server className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">{p.name}</h3>
                </div>
                <Switch checked={p.status === "active"} onCheckedChange={() => toggleStatus(p)} />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-4 p-2 rounded-lg bg-muted/30">
                <Globe className="h-3 w-3 shrink-0" />
                <span className="truncate">{p.api_url}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => syncServices(p.id)} disabled={syncing === p.id} className="flex-1 h-8 text-xs rounded-lg">
                  {syncing === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                  Sync
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-8 w-8">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteProvider(p.id)} className="h-8 w-8">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-bold">{editing ? "Edit Provider" : "Add Provider"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. SMMPanel.co" className="h-11 rounded-lg" /></div>
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API URL *</Label><Input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} placeholder="https://example.com/api/v2" className="h-11 rounded-lg" /></div>
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Key *</Label><Input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} type="password" placeholder="Your API key" className="h-11 rounded-lg" /></div>
            <Button onClick={handleSave} className="w-full font-semibold rounded-xl">{editing ? "Update" : "Add"} Provider</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
