import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Wallet, ShoppingCart, Calendar, ArrowDownCircle, ArrowUpCircle, History } from "lucide-react";

export default function UserAccount() {
  const { user, profile } = useAuth();
  const { format, formatWallet } = useCurrency();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["user-spending", user?.id],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("amount, created_at")
        .eq("user_id", user!.id);
      const totalSpent = orders?.reduce((sum, o) => sum + Number(o.amount), 0) ?? 0;
      const totalOrders = orders?.length ?? 0;
      return { totalSpent, totalOrders };
    },
    enabled: !!user?.id,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["user-transactions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">My Account</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Profile and transaction history</p>
      </div>

      {/* Profile Info */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 font-semibold">
            <User className="h-4 w-4 text-primary" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Name", value: profile?.name || "—" },
            { label: "Email", value: profile?.email },
            { label: "Status", value: profile?.status, capitalize: true },
            { label: "Member since", value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className={`font-medium text-foreground ${item.capitalize ? "capitalize" : ""}`}>{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Spending Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Wallet, label: "Wallet Balance", value: formatWallet(profile?.wallet_balance ?? 0), loading: false },
          { icon: ShoppingCart, label: "Total Spent", value: format(stats?.totalSpent ?? 0), loading: isLoading },
          { icon: Calendar, label: "Total Orders", value: String(stats?.totalOrders ?? 0), loading: isLoading },
        ].map((item) => (
          <Card key={item.label} className="border-border bg-card">
            <CardContent className="pt-5 pb-4 text-center">
              <item.icon className="h-5 w-5 mx-auto text-primary mb-2" />
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{item.label}</p>
              {item.loading ? (
                <Skeleton className="h-7 w-20 mx-auto mt-1" />
              ) : (
                <p className="text-lg font-bold text-foreground mt-0.5">{item.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transaction History */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 font-semibold">
            <History className="h-4 w-4 text-primary" /> Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !transactions?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
          ) : (
            <div className="table-wrapper">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold">Description</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const isCredit = tx.type === "deposit" || tx.type === "credit" || tx.type === "refund";
                    return (
                      <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <Badge variant={isCredit ? "default" : "secondary"} className="gap-1 text-xs">
                            {isCredit ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />}
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{tx.description || "—"}</TableCell>
                        <TableCell className={`text-right text-sm font-medium ${isCredit ? "text-success" : "text-foreground"}`}>
                          {isCredit ? "+" : "−"}{format(Math.abs(Number(tx.amount)))}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
