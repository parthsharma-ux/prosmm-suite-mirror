import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, ShoppingCart } from "lucide-react";
import type { Tables } from "@/types/database";

type Order = Tables<"orders">;

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  processing: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-success/10 text-success border-success/30",
  partial: "bg-warning/10 text-warning border-warning/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
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
      const { data, error } = await supabase.functions.invoke("refill-order", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Refill requested successfully (ID: ${data.refill_id})`);
      } else {
        toast.error(data?.error || "Refill not available");
      }
    } catch (e: any) {
      toast.error(e.message || "Refill failed");
    }
    setRefillingId(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">My Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track and manage your orders</p>
      </div>
      <Card className="border-border bg-card overflow-hidden">
        <div className="table-wrapper">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-xs">Order ID</TableHead>
                <TableHead className="font-semibold text-xs">Link</TableHead>
                <TableHead className="font-semibold text-xs">Quantity</TableHead>
                <TableHead className="font-semibold text-xs">Charge</TableHead>
                <TableHead className="font-semibold text-xs">Status</TableHead>
                <TableHead className="font-semibold text-xs">Date</TableHead>
                <TableHead className="font-semibold text-xs text-right">Refill</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No orders yet</p>
                  </TableCell>
                </TableRow>
              )}
              {orders.map((o) => (
                <TableRow key={o.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <span className="text-xs font-mono font-semibold text-primary">{o.id.slice(0, 8)}</span>
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-xs text-muted-foreground">{o.link}</TableCell>
                  <TableCell className="font-semibold text-sm">{o.quantity}</TableCell>
                  <TableCell className="font-bold text-sm">{format(o.amount)}</TableCell>
                  <TableCell><Badge variant="outline" className={`font-semibold capitalize text-[11px] ${statusColors[o.status] || ""}`}>{o.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {(o.status === "completed" || o.status === "partial") && o.provider_order_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={refillingId === o.id}
                        onClick={() => handleRefill(o.id)}
                        className="h-7 text-xs"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${refillingId === o.id ? "animate-spin" : ""}`} />
                        {refillingId === o.id ? "..." : "Refill"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
