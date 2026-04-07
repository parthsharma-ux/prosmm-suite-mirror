import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, ChevronLeft, ChevronRight, ShoppingCart, ExternalLink, Calendar, Hash, DollarSign } from "lucide-react";
import type { Tables } from "@/types/database";

type Order = Tables<"orders">;
type Profile = Tables<"profiles">;

const statusConfig: Record<string, { bg: string; dot: string }> = {
  pending: { bg: "bg-warning/10 text-warning border-warning/30", dot: "bg-warning" },
  processing: { bg: "bg-primary/10 text-primary border-primary/30", dot: "bg-primary" },
  completed: { bg: "bg-success/10 text-success border-success/30", dot: "bg-success" },
  partial: { bg: "bg-warning/10 text-warning border-warning/30", dot: "bg-warning" },
  cancelled: { bg: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  failed: { bg: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" },
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
      const { data: profilesData } = await supabase.from("profiles").select("*").in("user_id", userIds);
      if (profilesData) {
        const map: Record<string, Profile> = {};
        profilesData.forEach((p) => { map[p.user_id] = p; });
        setProfiles(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.from("payment_settings").select("details").eq("method", "market_rate").single().then(({ data }) => {
      if (data) {
        const details = data.details as Record<string, string> || {};
        const rate = parseFloat(details.rate);
        if (!isNaN(rate) && rate > 0) setMarketRate(rate);
      }
    });
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
    if (error) { toast.error("Failed to update status"); return; }
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
    } catch { toast.error("Failed to refresh statuses"); }
    setRefreshing(false);
  };

  if (loading && orders.length === 0) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Manage all orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshStatuses} disabled={refreshing} className="h-9 text-xs font-semibold rounded-lg">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Checking..." : "Refresh Status"}
          </Button>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36 h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {ALL_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="ecom-card p-12 text-center">
          <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No orders found</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => {
            const profile = profiles[o.user_id];
            const balanceUSD = profile?.wallet_balance ?? 0;
            const balanceINR = balanceUSD * marketRate;
            const cfg = statusConfig[o.status] || statusConfig.pending;
            return (
              <div key={o.id} className="ecom-card-interactive p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                    #{o.id.slice(0, 8)}
                  </span>
                  <Badge variant="outline" className={`font-semibold capitalize text-[11px] ${cfg.bg}`}>
                    <span className={`status-dot ${cfg.dot}`} />
                    {o.status}
                  </Badge>
                </div>

                {/* User info */}
                <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{profile?.email || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">${balanceUSD.toFixed(2)} / ₹{balanceINR.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-start gap-2">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground truncate flex-1">{o.link}</p>
                  </div>
                    <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-xs">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span className="font-semibold">{o.quantity}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="font-bold">{profile?.wallet_currency === "INR" ? "₹" : "$"}{o.amount}</span>
                    </div>
                  </div>
                </div>

                {/* Status Change */}
                <div className="mb-3">
                  <Select value={o.status} onValueChange={(val) => updateStatus(o, val)}>
                    <SelectTrigger className="w-full h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {(o.status === "failed" || o.status === "pending") && (
                  <Button variant="outline" size="sm" onClick={() => refundOrder(o)} className="w-full h-8 text-xs rounded-lg">
                    Refund
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="h-8 w-8 p-0 rounded-lg">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) pageNum = i;
              else if (page < 3) pageNum = i;
              else if (page > totalPages - 4) pageNum = totalPages - 7 + i;
              else pageNum = page - 3 + i;
              return (
                <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="sm" onClick={() => setPage(pageNum)} className="h-8 w-8 p-0 text-xs font-semibold rounded-lg">
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="h-8 w-8 p-0 rounded-lg">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
