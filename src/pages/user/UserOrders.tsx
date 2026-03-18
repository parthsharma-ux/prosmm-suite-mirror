import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, ShoppingCart, ExternalLink, Calendar, Hash, DollarSign } from "lucide-react";
import type { Tables } from "@/types/database";

type Order = Tables<"orders">;

const statusConfig: Record<string, { bg: string; dot: string }> = {
  pending: { bg: "bg-warning/10 text-warning border-warning/30", dot: "bg-warning" },
  processing: { bg: "bg-primary/10 text-primary border-primary/30", dot: "bg-primary" },
  completed: { bg: "bg-success/10 text-success border-success/30", dot: "bg-success" },
  partial: { bg: "bg-warning/10 text-warning border-warning/30", dot: "bg-warning" },
  cancelled: { bg: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  failed: { bg: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" },
};

export default function UserOrders() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refillingId, setRefillingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setOrders(data || []);
      setLoading(false);
    });
  }, [user]);

  const handleRefill = async (orderId: string) => {
    setRefillingId(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("refill-order", { body: { order_id: orderId } });
      if (error) throw error;
      if (data?.success) toast.success(`Refill requested successfully (ID: ${data.refill_id})`);
      else toast.error(data?.error || "Refill not available");
    } catch (e: any) { toast.error(e.message || "Refill failed"); }
    setRefillingId(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Orders</h1>
        <p className="page-subtitle">Track and manage your orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="ecom-card p-12 text-center">
          <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">No orders yet</p>
          <p className="text-xs text-muted-foreground mt-1">Your orders will appear here once placed</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => {
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

                <div className="space-y-2.5 mb-4">
                  <div className="flex items-start gap-2">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground truncate flex-1">{o.link}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{o.quantity}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="font-bold text-foreground">{format(o.amount)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(o.created_at).toLocaleDateString()}
                  </div>
                </div>

                {(o.status === "completed" || o.status === "partial") && o.provider_order_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={refillingId === o.id}
                    onClick={() => handleRefill(o.id)}
                    className="w-full h-9 text-xs rounded-lg"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refillingId === o.id ? "animate-spin" : ""}`} />
                    {refillingId === o.id ? "Requesting..." : "Request Refill"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
