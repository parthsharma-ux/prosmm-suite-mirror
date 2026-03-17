import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, Loader2, Link2, Search, Check } from "lucide-react";
import type { Tables } from "@/types/database";

type Provider = Tables<"providers">;
type Service = Tables<"public_services">;

interface ProviderService {
  service_id: string;
  name: string;
  rate: number;
  min: number;
  max: number;
  category: string;
  description: string | null;
}

export default function AdminMapping() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [localServices, setLocalServices] = useState<Service[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderService[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mappingServiceId, setMappingServiceId] = useState<string | null>(null);
  const [selectedLocalService, setSelectedLocalService] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const [p, s] = await Promise.all([
        supabase.from("providers").select("*").eq("status", "active").order("name"),
        supabase.from("public_services").select("*").order("name"),
      ]);
      setProviders(p.data || []);
      setLocalServices(s.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchProviderServices = async () => {
    if (!selectedProvider) { toast.error("Select a provider first"); return; }
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sync-provider-services`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ provider_id: selectedProvider }) }
      );
      const result = await res.json();
      if (result.error) toast.error(result.error);
      else { setProviderServices(result.services || []); toast.success(`Fetched ${result.total} services from provider`); }
    } catch (e: any) { toast.error(e.message || "Fetch failed"); }
    finally { setSyncing(false); }
  };

  const mapService = async (providerServiceId: string) => {
    if (!selectedLocalService) { toast.error("Select a local service to map"); return; }
    const { error } = await supabase.from("public_services").update({ provider_id: selectedProvider, provider_service_id: providerServiceId }).eq("id", selectedLocalService);
    if (error) toast.error(error.message);
    else {
      toast.success(`Mapped service ID ${providerServiceId} successfully`);
      setMappingServiceId(null);
      setSelectedLocalService("");
      const { data } = await supabase.from("public_services").select("*").order("name");
      setLocalServices(data || []);
    }
  };

  const getMappedLocalService = (providerServiceId: string) => localServices.find((s) => s.provider_service_id === providerServiceId && s.provider_id === selectedProvider);
  const filteredProviderServices = providerServices.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.service_id.includes(searchQuery) || s.category.toLowerCase().includes(q);
  });
  const unmappedLocalServices = localServices.filter((s) => !s.provider_service_id || !s.provider_id);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">API Mapping</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Map provider services to your local catalog</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-4"><CardTitle className="text-sm font-semibold">Select Provider & Fetch Services</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-48">
              <Select value={selectedProvider} onValueChange={(v) => { setSelectedProvider(v); setProviderServices([]); }}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select a provider" /></SelectTrigger>
                <SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={fetchProviderServices} disabled={syncing || !selectedProvider} className="h-10 font-semibold">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Fetch Services
            </Button>
          </div>
        </CardContent>
      </Card>

      {providerServices.length > 0 && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Badge variant="secondary" className="text-xs font-semibold">{providerServices.length} provider services</Badge>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, ID, category..." className="pl-9 h-9" />
            </div>
          </div>

          <Card className="border-border bg-card overflow-hidden">
            <div className="table-wrapper">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold text-xs">Service ID</TableHead>
                    <TableHead className="font-semibold text-xs">Name</TableHead>
                    <TableHead className="font-semibold text-xs">Category</TableHead>
                    <TableHead className="font-semibold text-xs">Rate</TableHead>
                    <TableHead className="font-semibold text-xs">Min/Max</TableHead>
                    <TableHead className="font-semibold text-xs">Status</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProviderServices.map((s) => {
                    const mapped = getMappedLocalService(s.service_id);
                    const isMapping = mappingServiceId === s.service_id;
                    return (
                      <TableRow key={s.service_id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 rounded bg-primary/10 text-primary border-0">#{s.service_id}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0 max-w-64">
                            <p className="font-semibold text-sm whitespace-normal break-words leading-tight">{s.name}</p>
                          </div>
                        </TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{s.category}</span></TableCell>
                        <TableCell><span className="font-semibold text-sm">${s.rate}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.min} / {s.max}</TableCell>
                        <TableCell>
                          {mapped ? (
                            <Badge className="bg-success/10 text-success border-0 text-[10px]">
                              <Check className="h-3 w-3 mr-1" /> Mapped
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">Unmapped</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isMapping ? (
                            <div className="flex items-center gap-2 justify-end flex-wrap">
                              <Select value={selectedLocalService} onValueChange={setSelectedLocalService}>
                                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Select service" /></SelectTrigger>
                                <SelectContent>
                                  {unmappedLocalServices.map((ls) => <SelectItem key={ls.id} value={ls.id} className="text-xs">{ls.name}</SelectItem>)}
                                  {localServices.filter(ls => ls.provider_service_id).map((ls) => <SelectItem key={ls.id} value={ls.id} className="text-xs text-muted-foreground">{ls.name} (remap)</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button size="sm" className="h-8 text-xs" onClick={() => mapService(s.service_id)} disabled={!selectedLocalService}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setMappingServiceId(null); setSelectedLocalService(""); }}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setMappingServiceId(s.service_id); setSelectedLocalService(mapped?.id || ""); }}>
                              <Link2 className="h-3 w-3 mr-1" /> {mapped ? "Remap" : "Map"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
