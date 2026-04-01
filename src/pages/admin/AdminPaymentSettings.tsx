import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Loader2, CreditCard, ArrowUpRight, DollarSign, TrendingUp } from "lucide-react";

export default function AdminPaymentSettings() {
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [trc20Address, setTrc20Address] = useState("");
  const [panelRate, setPanelRate] = useState("110");
  const [marketRate, setMarketRate] = useState("93");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("payment_settings").select("*");
      if (data) {
        for (const row of data) {
          const details = row.details as Record<string, string> || {};
          if (row.method === "upi") setUpiQrUrl((details.qr_url || "").trim());
          if (row.method === "usdt") setTrc20Address((details.address || "").trim());
          if (row.method === "exchange_rate") setPanelRate(details.rate || "110");
          if (row.method === "market_rate") setMarketRate(details.rate || "93");
        }
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    setUploading(true);
    const path = `qr-codes/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("payment-assets").upload(path, file, { upsert: true });
    if (uploadErr) { toast.error("Upload failed. Please paste a direct image URL instead."); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("payment-assets").getPublicUrl(path);
    setUpiQrUrl(urlData.publicUrl);
    toast.success("QR image uploaded!");
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = [
      supabase.from("payment_settings").upsert({ method: "upi", details: { qr_url: upiQrUrl.trim() }, updated_at: new Date().toISOString() }, { onConflict: "method" }),
      supabase.from("payment_settings").upsert({ method: "usdt", details: { address: trc20Address.trim() }, updated_at: new Date().toISOString() }, { onConflict: "method" }),
      supabase.from("payment_settings").upsert({ method: "exchange_rate", details: { rate: panelRate }, updated_at: new Date().toISOString() }, { onConflict: "method" }),
      supabase.from("payment_settings").upsert({ method: "market_rate", details: { rate: marketRate }, updated_at: new Date().toISOString() }, { onConflict: "method" }),
    ];
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed) {
      console.error("Payment settings save error:", failed.error);
      toast.error(`Failed to save: ${failed.error.message}`);
    } else {
      toast.success("Payment settings saved!");
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Payment Settings</h1>
        <p className="page-subtitle">Configure payment methods and rates</p>
      </div>

      <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
        <div className="ecom-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">UPI QR Code</h3>
          </div>
          <div className="space-y-4">
            {upiQrUrl && (
              <div className="w-full flex justify-center">
                <img src={upiQrUrl} alt="UPI QR" className="max-w-44 rounded-xl border border-border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Upload QR Image</Label>
              <div className="flex gap-2">
                <Input type="file" accept="image/*" onChange={handleQrUpload} disabled={uploading} className="flex-1 h-11 rounded-lg" />
                {uploading && <Loader2 className="h-4 w-4 animate-spin mt-3" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Or paste direct image URL</Label>
              <Input value={upiQrUrl} onChange={(e) => setUpiQrUrl(e.target.value)} placeholder="https://example.com/qr.png" className="h-11 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="ecom-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-success/10">
              <ArrowUpRight className="h-5 w-5 text-success" />
            </div>
            <h3 className="font-semibold text-foreground">USDT TRC20 Address</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Wallet Address</Label>
              <Input value={trc20Address} onChange={(e) => setTrc20Address(e.target.value)} placeholder="T..." className="font-mono text-xs h-11 rounded-lg" />
            </div>
            {trc20Address && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono text-muted-foreground break-all border border-border">{trc20Address}</div>
            )}
          </div>
        </div>

        <div className="ecom-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-warning/10">
              <DollarSign className="h-5 w-5 text-warning" />
            </div>
            <h3 className="font-semibold text-foreground">Panel Rate (Service Pricing)</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">1 USD = ? INR</Label>
              <Input type="number" step="0.01" value={panelRate} onChange={(e) => setPanelRate(e.target.value)} placeholder="110" className="h-11 rounded-lg" />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground border border-border">
              Example: $1.00 = ₹{(1 * parseFloat(panelRate || "0")).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="ecom-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Market Rate (Deposits)</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">1 USDT = ? INR</Label>
              <Input type="number" step="0.01" value={marketRate} onChange={(e) => setMarketRate(e.target.value)} placeholder="93" className="h-11 rounded-lg" />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground border border-border">
              Example: 1 USDT = ₹{parseFloat(marketRate || "0").toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2 font-semibold rounded-xl shadow-lg shadow-primary/20">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Settings
      </Button>
    </div>
  );
}
