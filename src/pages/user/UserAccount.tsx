import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { User, Wallet, ShoppingCart, Calendar, ArrowDownCircle, ArrowUpCircle, History } from "lucide-react";

export default function UserAccount() {
  const { user, profile } = useAuth();
  const { format, formatWallet } = useCurrency();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["user-spending", user?.id],
    queryFn: async () => {
      const { data: orders } = await supabase.from("orders").select("amount, created_at").eq("user_id", user!.id);
      const totalSpent = orders?.reduce((sum, o) => sum + Number(o.amount), 0) ?? 0;
      const totalOrders = orders?.length ?? 0;
      return { totalSpent, totalOrders };
    },
    enabled: !!user?.id,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["user-transactions", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Account</h1>
        <p className="page-subtitle">Profile and transaction history</p>
      </div>

      {/* Profile Card */}
      <div className="ecom-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Profile Information</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: "Name", value: profile?.name || "—" },
            { label: "Email", value: profile?.email },
            { label: "Status", value: profile?.status, capitalize: true },
            { label: "Member since", value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className={`text-sm font-medium text-foreground ${item.capitalize ? "capitalize" : ""}`}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Wallet, label: "Wallet Balance", value: formatWallet(profile?.wallet_balance ?? 0), loading: false, color: "bg-primary/10 text-primary" },
          { icon: ShoppingCart, label: "Total Spent", value: format(stats?.totalSpent ?? 0), loading: isLoading, color: "bg-warning/10 text-warning" },
          { icon: Calendar, label: "Total Orders", value: String(stats?.totalOrders ?? 0), loading: isLoading, color: "bg-success/10 text-success" },
        ].map((item) => (
          <div key={item.label} className="ecom-card-interactive p-5 text-center">
            <div className={`p-2.5 rounded-xl ${item.color} w-fit mx-auto mb-3`}>
              <item.icon className="h-5 w-5" />
            </div>
            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{item.label}</p>
            {item.loading ? (
              <Skeleton className="h-7 w-20 mx-auto mt-1" />
            ) : (
              <p className="text-xl font-bold text-foreground mt-1">{item.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Transaction History */}
      <div className="ecom-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <History className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Transaction History</h3>
        </div>

        {txLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : !transactions?.length ? (
          <div className="text-center py-8">
            <History className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const isCredit = tx.type === "deposit" || tx.type === "credit" || tx.type === "refund";
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-lg ${isCredit ? "bg-success/10" : "bg-muted"}`}>
                    {isCredit ? <ArrowDownCircle className="h-4 w-4 text-success" /> : <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={isCredit ? "default" : "secondary"} className="text-[10px] capitalize">{tx.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{tx.description || "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${isCredit ? "text-success" : "text-foreground"}`}>
                      {isCredit ? "+" : "−"}{format(Math.abs(Number(tx.amount)))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
