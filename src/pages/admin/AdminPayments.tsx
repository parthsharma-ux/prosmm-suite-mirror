import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { Tables } from "@/types/database";

type PaymentRequest = Tables<"payment_requests">;

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  approved: "bg-success/10 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
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
    
    // For USDT payments, convert using market rate to get INR value
    let creditAmount = p.amount;
    if (p.method === "usdt") {
      const { data: rateData } = await supabase.from("payment_settings").select("details").eq("method", "market_rate").maybeSingle();
      if (rateData) {
        const details = rateData.details as Record<string, string> || {};
        const rate = parseFloat(details.rate);
        if (!isNaN(rate) && rate > 0) creditAmount = p.amount * rate;
      }
    }
    
    const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("user_id", p.user_id).single();
    if (profile) {
      await supabase.from("profiles").update({ wallet_balance: profile.wallet_balance + creditAmount }).eq("user_id", p.user_id);
      await supabase.from("transactions").insert({ user_id: p.user_id, type: "credit" as const, amount: creditAmount, description: `Payment via ${p.method} - ${p.transaction_id || ''} (${p.method === 'usdt' ? p.amount + ' USDT' : '$' + p.amount})` });
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
    <div className="space-y-6">
      <h2 className="text-xl font-bold tracking-tight">Payment Requests</h2>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Method</TableHead><TableHead>Amount</TableHead><TableHead>Reference</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {payments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payments</TableCell></TableRow>}
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="uppercase font-medium text-xs">{p.method}</TableCell>
                <TableCell>{p.method === "usdt" ? "$" : "₹"}{p.amount}</TableCell>
                <TableCell className="font-mono text-xs max-w-32 truncate">{p.transaction_id || "—"}</TableCell>
                <TableCell><Badge variant="outline" className={statusColors[p.status] || ""}>{p.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right space-x-1">
                  {p.status === "pending" && (<><Button size="sm" onClick={() => approve(p)}>Approve</Button><Button variant="outline" size="sm" onClick={() => reject(p)}>Reject</Button></>)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
