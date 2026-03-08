import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import type { Tables } from "@/types/database";

type Order = Tables<"orders">;

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  processing: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-success/10 text-success border-success/30",
  partial: "bg-warning/10 text-warning border-warning/30",
  cancelled: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchOrders = async () => {
    let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter as Order["status"]);
    const { data } = await q;
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const refundOrder = async (order: Order) => {
    if (!confirm("Refund this order?")) return;
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("user_id", order.user_id).single();
    if (profile) {
      await supabase.from("profiles").update({ wallet_balance: profile.wallet_balance + order.amount }).eq("user_id", order.user_id);
      await supabase.from("transactions").insert({ user_id: order.user_id, type: "refund" as const, amount: order.amount, description: `Refund for order ${order.id.slice(0, 8)}` });
    }
    toast.success("Order refunded");
    fetchOrders();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const [refreshing, setRefreshing] = useState(false);

  const refreshStatuses = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-order-status");
      if (error) throw error;
      toast.success(`Status check complete: ${data?.updated || 0} orders updated`);
      fetchOrders();
    } catch (e: any) {
      toast.error("Failed to refresh statuses");
    }
    setRefreshing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Orders</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshStatuses} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Checking..." : "Refresh Status"}
          </Button>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="processing">Processing</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Link</TableHead><TableHead>Qty</TableHead><TableHead>Charge</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {orders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No orders</TableCell></TableRow>}
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                <TableCell className="max-w-32 truncate text-xs">{o.link}</TableCell>
                <TableCell>{o.quantity}</TableCell>
                <TableCell>${o.amount}</TableCell>
                <TableCell><Badge variant="outline" className={statusColors[o.status] || ""}>{o.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {(o.status === "failed" || o.status === "pending") && <Button variant="outline" size="sm" onClick={() => refundOrder(o)}>Refund</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
