import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, Wallet, ArrowUpRight } from "lucide-react";
import type { Tables } from "@/types/database";

type PaymentRequest = Tables<"payment_requests">;

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  approved: "bg-success/10 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function UserFunds() {
  const { user } = useAuth();
  const [method, setMethod] = useState<string>("upi");
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [trc20Address, setTrc20Address] = useState("");

  const fetchPayments = () => {
    if (!user) return;
    supabase.from("payment_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setPayments(data || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchPayments();
    supabase.from("payment_settings").select("*").then(({ data }) => {
      if (data) {
        for (const row of data) {
          const details = row.details as Record<string, string> || {};
          if (row.method === "upi") setUpiQrUrl(details.qr_url || "");
          if (row.method === "usdt") setTrc20Address(details.address || "");
        }
      }
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || amount <= 0 || !reference.trim()) { toast.error("Fill all fields"); return; }
    setSubmitting(true);
    let screenshotUrl: string | null = null;
    if (screenshot) {
      const path = `${user.id}/${Date.now()}-${screenshot.name}`;
      const { error: uploadErr } = await supabase.storage.from("payment-screenshots").upload(path, screenshot);
      if (uploadErr) { toast.error("Screenshot upload failed"); setSubmitting(false); return; }
      screenshotUrl = path;
    }
    const { error } = await supabase.from("payment_requests").insert({
      user_id: user.id, method: method, amount, transaction_id: reference.trim(),
    });
    if (error) {
      if (error.message.includes("duplicate")) toast.error("This reference has already been submitted");
      else toast.error(error.message);
    } else {
      toast.success("Payment request submitted!");
      setAmount(0); setReference(""); setScreenshot(null); fetchPayments();
    }
    setSubmitting(false);
  };

  const copyAddress = () => { navigator.clipboard.writeText(trc20Address); toast.success("Address copied!"); };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <h2 className="text-base font-semibold text-foreground">Add Funds</h2>
      {method === "upi" && upiQrUrl && (
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Wallet className="h-4 w-4" /><span>Scan QR to Pay via UPI</span></div>
            <div className="rounded-xl border-2 border-primary/20 p-2 bg-background shadow-lg">
              <img src={upiQrUrl} alt="UPI QR Code" className="w-52 h-52 rounded-lg object-contain" />
            </div>
            <p className="text-xs text-muted-foreground">Pay using any UPI app and submit the UTR below</p>
          </CardContent>
        </Card>
      )}
      {method === "usdt" && trc20Address && (
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><ArrowUpRight className="h-4 w-4" /><span>Send USDT (TRC20) to this address</span></div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border p-3">
              <span className="text-xs font-mono text-foreground break-all flex-1">{trc20Address}</span>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={copyAddress}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Send exact amount and submit the Transaction ID below</p>
          </CardContent>
        </Card>
      )}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-4"><CardTitle className="text-sm">Submit Payment</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Payment Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="upi">UPI</SelectItem><SelectItem value="usdt">USDT (TRC20)</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Amount ($)</Label>
              <Input type="number" step="0.01" min="1" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} required className="w-full" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{method === "upi" ? "UTR Number" : "Transaction ID"}</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} required placeholder="Enter reference" className="w-full" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Screenshot (optional)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} className="w-full" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Submitting..." : "Submit Payment"}</Button>
          </form>
        </CardContent>
      </Card>
      <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Method</TableHead><TableHead>Amount</TableHead><TableHead>Reference</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>
            {payments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No payments yet</TableCell></TableRow>}
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="uppercase font-medium text-xs">{p.method}</TableCell>
                <TableCell>${p.amount}</TableCell>
                <TableCell className="font-mono text-xs max-w-32 truncate">{p.transaction_id || "—"}</TableCell>
                <TableCell><Badge variant="outline" className={statusColors[p.status] || ""}>{p.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
