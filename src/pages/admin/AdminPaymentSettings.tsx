import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2, Upload } from "lucide-react";

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
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setUploading(true);
    const path = `qr-codes/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("payment-assets").upload(path, file, { upsert: true });
    if (uploadErr) {
      // If bucket doesn't exist, fall back to URL input
      toast.error("Upload failed. Please paste a direct image URL instead.");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("payment-assets").getPublicUrl(path);
    setUpiQrUrl(urlData.publicUrl);
    toast.success("QR image uploaded!");
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = [
      supabase.from("payment_settings").upsert(
        { method: "upi", details: { qr_url: upiQrUrl.trim() }, updated_at: new Date().toISOString() },
        { onConflict: "method" }
      ),
      supabase.from("payment_settings").upsert(
        { method: "usdt", details: { address: trc20Address.trim() }, updated_at: new Date().toISOString() },
        { onConflict: "method" }
      ),
      supabase.from("payment_settings").upsert(
        { method: "exchange_rate", details: { rate: panelRate }, updated_at: new Date().toISOString() },
        { onConflict: "method" }
      ),
      supabase.from("payment_settings").upsert(
        { method: "market_rate", details: { rate: marketRate }, updated_at: new Date().toISOString() },
        { onConflict: "method" }
      ),
    ];
    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);
    if (hasError) toast.error("Failed to save settings");
    else toast.success("Payment settings saved!");
    setSaving(false);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold tracking-tight">Payment Settings</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm">UPI QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upiQrUrl && (
              <div className="w-full flex justify-center">
                <img
                  src={upiQrUrl}
                  alt="UPI QR"
                  className="max-w-48 rounded-lg border border-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    toast.error("QR image failed to load. Make sure it's a direct image URL (ending in .png, .jpg, etc.)");
                  }}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Upload QR Image</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  disabled={uploading}
                  className="flex-1"
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin mt-2.5" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Or paste direct image URL</Label>
              <Input
                value={upiQrUrl}
                onChange={(e) => setUpiQrUrl(e.target.value)}
                placeholder="https://example.com/qr.png"
              />
              <p className="text-[10px] text-muted-foreground">Must be a direct image link (not a webpage). URL should end in .png, .jpg, .jpeg, .webp etc.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm">USDT TRC20 Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Wallet Address</Label>
              <Input
                value={trc20Address}
                onChange={(e) => setTrc20Address(e.target.value)}
                placeholder="T..."
                className="font-mono text-xs"
              />
            </div>
            {trc20Address && (
              <div className="rounded-md bg-muted p-3 text-xs font-mono text-muted-foreground break-all">
                {trc20Address}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm">Panel Rate (Service Pricing)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">1 USD = ? INR (for service prices)</Label>
              <Input
                type="number"
                step="0.01"
                value={panelRate}
                onChange={(e) => setPanelRate(e.target.value)}
                placeholder="110"
              />
            </div>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Example: $1.00 service = ₹{(1 * parseFloat(panelRate || "0")).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm">Market Rate (Deposits)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">1 USDT = ? INR (for deposit conversion)</Label>
              <Input
                type="number"
                step="0.01"
                value={marketRate}
                onChange={(e) => setMarketRate(e.target.value)}
                placeholder="93"
              />
            </div>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Example: 1 USDT deposit = ₹{parseFloat(marketRate || "0").toFixed(2)} in wallet
            </div>
          </CardContent>
        </Card>
      </div>
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Settings
      </Button>
    </div>
  );
}
