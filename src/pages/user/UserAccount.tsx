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
  const { format } = useCurrency();

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
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-foreground">My Account</h1>

      {/* Profile Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium text-foreground">{profile?.name || "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-foreground">{profile?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium text-foreground capitalize">{profile?.status}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Member since</span>
            <span className="font-medium text-foreground">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Spending Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Wallet className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="text-lg font-bold text-foreground">{format(profile?.wallet_balance ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <ShoppingCart className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Total Spent</p>
            {isLoading ? (
              <Skeleton className="h-7 w-20 mx-auto mt-1" />
            ) : (
              <p className="text-lg font-bold text-foreground">{format(stats?.totalSpent ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Total Orders</p>
            {isLoading ? (
              <Skeleton className="h-7 w-12 mx-auto mt-1" />
            ) : (
              <p className="text-lg font-bold text-foreground">{stats?.totalOrders ?? 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Transaction History
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const isCredit = tx.type === "deposit" || tx.type === "credit" || tx.type === "refund";
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <Badge variant={isCredit ? "default" : "secondary"} className="gap-1 text-xs">
                            {isCredit ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />}
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{tx.description || "—"}</TableCell>
                        <TableCell className={`text-right text-sm font-medium ${isCredit ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
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
