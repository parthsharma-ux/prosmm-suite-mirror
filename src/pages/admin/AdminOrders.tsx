import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import type { Tables } from "@/types/database";

type Order = Tables<"orders">;
type Profile = Tables<"profiles">;

const statusColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  processing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-success/15 text-success border-success/30",
  partial: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

const ALL_STATUSES = ["pending", "processing", "completed", "partial", "cancelled", "failed"];
const PAGE_SIZE = 20;

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [marketRate, setMarketRate] = useState(93);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrders = async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = supabase.from("orders").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    if (filter !== "all") q = q.eq("status", filter as Order["status"]);
    const { data, count } = await q;
    setOrders(data || []);
    setTotalCount(count || 0);

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((o) => o.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);
      if (profilesData) {
        const map: Record<string, Profile> = {};
        profilesData.forEach((p) => { map[p.user_id] = p; });
        setProfiles(map);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    const fetchMarketRate = async () => {
      const { data } = await supabase
        .from("payment_settings")
        .select("details")
        .eq("method", "market_rate")
        .single();
      if (data) {
        const details = data.details as Record<string, string> || {};
        const rate = parseFloat(details.rate);
        if (!isNaN(rate) && rate > 0) setMarketRate(rate);
      }
    };
    fetchMarketRate();
  }, []);

  useEffect(() => { setPage(0); }, [filter]);
  useEffect(() => { fetchOrders(); }, [filter, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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

  const updateStatus = async (order: Order, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(`Order status updated to ${newStatus}`);
    fetchOrders();
  };

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

  if (loading && orders.length === 0) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Orders</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshStatuses} disabled={refreshing} className="border-border/50 hover:bg-accent">
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Checking..." : "Refresh Status"}
          </Button>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 border-b border-border/40">
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">ID</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">User</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Link</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Qty</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Charge</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Set Status</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">No orders found</TableCell>
              </TableRow>
            )}
            {orders.map((o) => {
              const profile = profiles[o.user_id];
              const balanceUSD = profile?.wallet_balance ?? 0;
              const balanceINR = balanceUSD * marketRate;
              return (
                <TableRow key={o.id} className="border-b border-border/20 hover:bg-accent/30 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-primary">{o.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground truncate max-w-28">{profile?.email || "—"}</div>
                      <div className="text-muted-foreground text-[11px]">
                        ${balanceUSD.toFixed(2)} / ₹{balanceINR.toFixed(2)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-32 truncate text-xs text-muted-foreground">{o.link}</TableCell>
                  <TableCell className="font-semibold text-foreground">{o.quantity}</TableCell>
                  <TableCell className="font-bold text-foreground">${o.amount}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-semibold capitalize text-[11px] ${statusColors[o.status] || "bg-secondary text-foreground border-border"}`}>
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select value={o.status} onValueChange={(val) => updateStatus(o, val)}>
                      <SelectTrigger className="w-[120px] h-8 text-xs border-border/40 bg-secondary/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    {(o.status === "failed" || o.status === "pending") && (
                      <Button variant="outline" size="sm" onClick={() => refundOrder(o)} className="border-primary/30 text-primary hover:bg-primary/10 text-xs">
                        Refund
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} orders
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 px-2.5 border-border/40 hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 7 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className={`h-8 w-8 p-0 text-xs font-semibold ${page === pageNum ? "bg-primary text-primary-foreground shadow-md" : "border-border/40 hover:bg-accent"}`}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 px-2.5 border-border/40 hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
