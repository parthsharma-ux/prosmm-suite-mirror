import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default function UserOrders() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setOrders(data || []);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold tracking-tight">My Orders</h2>
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Order ID</TableHead><TableHead className="font-semibold">Link</TableHead><TableHead className="font-semibold">Quantity</TableHead><TableHead className="font-semibold">Charge</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="font-semibold">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No orders yet</TableCell></TableRow>}
            {orders.map((o) => (
              <TableRow key={o.id} className="hover:bg-muted/20 transition-colors">
                <TableCell><Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border-0 font-mono">{o.id.slice(0, 8)}</Badge></TableCell>
                <TableCell className="max-w-40 truncate text-xs text-muted-foreground">{o.link}</TableCell>
                <TableCell className="font-semibold">{o.quantity}</TableCell>
                <TableCell className="font-bold">{format(o.amount)}</TableCell>
                <TableCell><Badge variant="outline" className={`font-semibold capitalize ${statusColors[o.status] || ""}`}>{o.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
