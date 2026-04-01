import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StatCard from "@/components/StatCard";
import { Wallet, ShoppingCart, CheckCircle, Clock, TrendingUp, ArrowRight, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function UserDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  const walletCurrency = (profile as any)?.wallet_currency as string | null;

  // Show balance in the user's locked currency directly
  const getBalanceDisplay = () => {
    const balance = profile?.wallet_balance ?? 0;
    if (walletCurrency === "INR") return `₹${balance.toFixed(2)}`;
    if (walletCurrency === "USDT") return `$${balance.toFixed(2)}`;
    // Not locked yet - show raw USD
    return `$${balance.toFixed(2)}`;
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [total, active, completed] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("status", ["pending", "processing"]),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
      ]);
      setStats({ total: total.count || 0, active: active.count || 0, completed: completed.count || 0 });
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your account activity</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ecom-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wallet Balance</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{getBalanceDisplay()}</p>
          {walletCurrency ? (
            <Badge variant="outline" className="mt-2 text-[10px] font-semibold gap-1 border-primary/30 text-primary">
              <Lock className="h-2.5 w-2.5" />
              {walletCurrency} Locked
            </Badge>
          ) : (
            <p className="text-[10px] text-muted-foreground mt-2">Currency locks after first deposit</p>
          )}
        </div>
        <StatCard title="Total Orders" value={stats.total} icon={ShoppingCart} />
        <StatCard title="Active Orders" value={stats.active} icon={Clock} />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle} />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Place New Order", desc: "Browse services and place an order", icon: ShoppingCart, path: "/dashboard/services", color: "bg-primary/10 text-primary" },
          { title: "Add Funds", desc: "Deposit money to your wallet", icon: Wallet, path: "/dashboard/funds", color: "bg-success/10 text-success" },
          { title: "View Orders", desc: "Track your order history", icon: TrendingUp, path: "/dashboard/orders", color: "bg-warning/10 text-warning" },
        ].map((action) => (
          <div key={action.title} className="ecom-card-interactive p-5 cursor-pointer group" onClick={() => navigate(action.path)}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${action.color} shrink-0`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-foreground">{action.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}