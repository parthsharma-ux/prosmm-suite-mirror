import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Wallet, ArrowUpRight, CreditCard, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { Tables } from "@/types/database";

type PaymentRequest = Tables<"payment_requests">;

const statusConfig: Record<string, { bg: string; icon: any; dot: string }> = {
  pending: { bg: "bg-warning/10 text-warning border-warning/30", icon: Clock, dot: "bg-warning" },
  approved: { bg: "bg-success/10 text-success border-success/30", icon: CheckCircle, dot: "bg-success" },
  rejected: { bg: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle, dot: "bg-destructive" },
};

export default function UserFunds() {
  const { user, profile } = useAuth();
  const walletCurrency = (profile as any)?.wallet_currency as string | null;
  const [method, setMethod] = useState<string>("");
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [trc20Address, setTrc20Address] = useState("");

  // If currency is locked, force method
  useEffect(() => {
    if (walletCurrency === "INR") setMethod("upi");
    else if (walletCurrency === "USDT") setMethod("usdt");
    else if (!method) setMethod("upi");
  }, [walletCurrency]);

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

    // Prevent mixed currency deposits
    if (walletCurrency === "INR" && method === "usdt") {
      toast.error("Your wallet is locked to INR. You cannot deposit USDT.");
      return;
    }
    if (walletCurrency === "USDT" && method === "upi") {
      toast.error("Your wallet is locked to USDT. You cannot deposit INR.");
      return;
    }

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

  const showUpi = !walletCurrency || walletCurrency === "INR";
  const showUsdt = !walletCurrency || walletCurrency === "USDT";

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Add Funds</h1>
        <p className="page-subtitle">Deposit funds to your wallet</p>
      </div>

      {/* Currency lock warning for first-time users */}
      {!walletCurrency && (
        <div className="ecom-card p-4 border-warning/40 bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Important: Currency Lock</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your wallet currency will be locked after your first approved deposit. If you deposit via UPI, your wallet will be in INR. If you deposit USDT, your wallet will be in USDT. You cannot change this later.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Info Cards */}
      <div className={`grid gap-4 grid-cols-1 ${showUpi && showUsdt ? "sm:grid-cols-2" : ""}`}>
        {showUpi && (
          <div
            className={`ecom-card-interactive p-5 cursor-pointer ${method === "upi" ? "border-primary/40 shadow-md shadow-primary/10" : ""}`}
            onClick={() => !walletCurrency && setMethod("upi")}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">UPI Payment</h3>
                <p className="text-[11px] text-muted-foreground">Pay via any UPI app (INR)</p>
              </div>
            </div>
            {method === "upi" && upiQrUrl && (
              <div className="flex justify-center mt-3">
                <div className="rounded-xl border border-border p-2 bg-muted/30">
                  <img src={upiQrUrl} alt="UPI QR Code" className="w-36 h-36 rounded-lg object-contain" />
                </div>
              </div>
            )}
          </div>
        )}

        {showUsdt && (
          <div
            className={`ecom-card-interactive p-5 cursor-pointer ${method === "usdt" ? "border-primary/40 shadow-md shadow-primary/10" : ""}`}
            onClick={() => !walletCurrency && setMethod("usdt")}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-success/10">
                <ArrowUpRight className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">USDT (TRC20)</h3>
                <p className="text-[11px] text-muted-foreground">Send crypto directly (USDT)</p>
              </div>
            </div>
            {method === "usdt" && trc20Address && (
              <div className="mt-3">
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border p-3">
                  <span className="text-[10px] font-mono text-foreground break-all flex-1">{trc20Address}</span>
                  <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={(e) => { e.stopPropagation(); copyAddress(); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit Payment Form */}
      <div className="ecom-card p-6">
        <h3 className="font-semibold text-base text-foreground mb-5 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          Submit Payment
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount ({method === "usdt" ? "$" : "₹"})</Label>
            <Input type="number" step="0.01" min="1" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} required className="h-11 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{method === "upi" ? "UTR Number" : "Transaction ID"}</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} required placeholder="Enter reference" className="h-11 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Screenshot (optional)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} className="h-11 rounded-lg" />
          </div>
          <Button type="submit" className="w-full h-11 font-semibold rounded-xl shadow-lg shadow-primary/20" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Payment"}
          </Button>
        </form>
      </div>

      {/* Payment History */}
      <div>
        <h2 className="font-semibold text-base text-foreground mb-4">Payment History</h2>
        {payments.length === 0 ? (
          <div className="ecom-card p-8 text-center">
            <CreditCard className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No payments yet</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {payments.map((p) => {
              const cfg = statusConfig[p.status] || statusConfig.pending;
              return (
                <div key={p.id} className="ecom-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{p.method}</span>
                    <Badge variant="outline" className={`text-[11px] font-semibold capitalize ${cfg.bg}`}>
                      <span className={`status-dot ${cfg.dot}`} />
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-xl font-bold text-foreground mb-1">{p.method === "usdt" ? "$" : "₹"}{p.amount}</p>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">{p.transaction_id || "—"}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">{new Date(p.created_at).toLocaleDateString()}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
