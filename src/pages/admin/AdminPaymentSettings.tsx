import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

export default function AdminPaymentSettings() {
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [trc20Address, setTrc20Address] = useState("");
  const [exchangeRate, setExchangeRate] = useState("83.50");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("payment_settings").select("*");
      if (data) {
        for (const row of data) {
          if (row.setting_key === "upi_qr_url") setUpiQrUrl(row.setting_value);
          if (row.setting_key === "trc20_address") setTrc20Address(row.setting_value);
          if (row.setting_key === "usd_to_inr_rate") setExchangeRate(row.setting_value);
        }
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleUploadQr = async (file: File) => {
    setUploading(true);
    const path = `qr/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("payment-screenshots").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("payment-screenshots").getPublicUrl(path);
    setUpiQrUrl(urlData.publicUrl);
    setUploading(false);
    toast.success("QR uploaded");
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = [
      supabase.from("payment_settings").update({ setting_value: upiQrUrl, updated_at: new Date().toISOString() }).eq("setting_key", "upi_qr_url"),
      supabase.from("payment_settings").update({ setting_value: trc20Address, updated_at: new Date().toISOString() }).eq("setting_key", "trc20_address"),
      supabase.from("payment_settings").update({ setting_value: exchangeRate, updated_at: new Date().toISOString() }).eq("setting_key", "usd_to_inr_rate"),
    ];
    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);
    if (hasError) toast.error("Failed to save settings");
    else toast.success("Payment settings saved!");
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold tracking-tight">Payment Settings</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader><CardTitle className="text-sm">UPI QR Code</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {upiQrUrl && <div className="w-full flex justify-center"><img src={upiQrUrl} alt="UPI QR" className="max-w-48 rounded-lg border border-border" /></div>}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Upload QR Image</Label>
              <Input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadQr(file); }} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Or paste image URL</Label>
              <Input value={upiQrUrl} onChange={(e) => setUpiQrUrl(e.target.value)} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader><CardTitle className="text-sm">USDT TRC20 Address</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Wallet Address</Label>
              <Input value={trc20Address} onChange={(e) => setTrc20Address(e.target.value)} placeholder="T..." className="font-mono text-xs" />
            </div>
            {trc20Address && <div className="rounded-md bg-muted p-3 text-xs font-mono text-muted-foreground break-all">{trc20Address}</div>}
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader><CardTitle className="text-sm">USD → INR Exchange Rate</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">1 USD = ? INR</Label>
              <Input type="number" step="0.01" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} placeholder="83.50" />
            </div>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">Example: $10.00 = ₹{(10 * parseFloat(exchangeRate || "0")).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Settings
      </Button>
    </div>
  );
}
