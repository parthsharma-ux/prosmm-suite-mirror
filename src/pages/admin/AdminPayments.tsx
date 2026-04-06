import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Clock, CheckCircle, XCircle, Calendar, DollarSign } from "lucide-react";
import type { Tables } from "@/types/database";

type PaymentRequest = Tables<"payment_requests">;

const statusConfig: Record<string, { bg: string; dot: string }> = {
  pending: { bg: "bg-warning/10 text-warning border-warning/30", dot: "bg-warning" },
  approved: { bg: "bg-success/10 text-success border-success/30", dot: "bg-success" },
  rejected: { bg: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" },
};

export default function AdminPayments() {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    const { data } = await supabase.from("payment_requests").select("*").order("created_at", { ascending: false });
    setPayments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, []);

  const approve = async (p: PaymentRequest) => {
    if (!confirm("Approve this payment?")) return;
    await supabase.from("payment_requests").update({ status: "approved" as const }).eq("id", p.id);

    // Credit the exact deposited amount in native currency — NO conversion
    // UPI deposits are in INR, USDT deposits are in USDT
    const creditAmount = p.amount;

    const { data: profile } = await supabase.from("profiles").select("wallet_balance, wallet_currency").eq("user_id", p.user_id).single() as any;
    if (profile) {
      // Lock currency on first approved deposit
      const newCurrency = (profile as any).wallet_currency || (p.method === "upi" ? "INR" : "USDT");
      const currencySymbol = newCurrency === "INR" ? "₹" : "$";
      await (supabase.from("profiles") as any).update({
        wallet_balance: profile.wallet_balance + creditAmount,
        wallet_currency: newCurrency,
      }).eq("user_id", p.user_id);

      await supabase.from("transactions").insert({
        user_id: p.user_id,
        type: "credit" as const,
        amount: creditAmount,
        description: `Payment via ${p.method} - ${p.transaction_id || ''} (${currencySymbol}${p.amount})`,
      });
    }
    toast.success("Payment approved & wallet credited");
    fetchPayments();
  };

  const reject = async (p: PaymentRequest) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    await supabase.from("payment_requests").update({ status: "rejected" as const }).eq("id", p.id);
    toast.success("Payment rejected");
    fetchPayments();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Payment Requests</h1>
        <p className="page-subtitle">Review and manage payment submissions</p>
      </div>

      {payments.length === 0 ? (
        <div className="ecom-card p-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No payment requests</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {payments.map((p) => {
            const cfg = statusConfig[p.status] || statusConfig.pending;
            return (
              <div key={p.id} className="ecom-card-interactive p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded">{p.method}</span>
                  <Badge variant="outline" className={`text-[11px] font-semibold capitalize ${cfg.bg}`}>
                    <span className={`status-dot ${cfg.dot}`} />
                    {p.status}
                  </Badge>
                </div>

                <p className="text-2xl font-bold text-foreground mb-1">{p.method === "usdt" ? "$" : "₹"}{p.amount}</p>

                <div className="space-y-1.5 mb-4">
                  <p className="text-[11px] font-mono text-muted-foreground truncate">Ref: {p.transaction_id || "—"}</p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>

                {p.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => approve(p)} className="flex-1 h-8 text-xs font-semibold rounded-lg shadow-lg shadow-primary/20">
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => reject(p)} className="flex-1 h-8 text-xs rounded-lg">
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
