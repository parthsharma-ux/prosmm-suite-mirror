import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import StatCard from "@/components/StatCard";
import { Wallet, ShoppingCart, CheckCircle, Clock, IndianRupee } from "lucide-react";

export default function UserDashboard() {
  const { user, profile } = useAuth();
  const { format } = useCurrency();
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [marketRate, setMarketRate] = useState(93);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [total, active, completed, rateData] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("status", ["pending", "processing"]),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
        supabase.from("payment_settings").select("details").eq("method", "market_rate").maybeSingle(),
      ]);
      setStats({ total: total.count || 0, active: active.count || 0, completed: completed.count || 0 });
      if (rateData.data) {
        const details = rateData.data.details as Record<string, string> || {};
        const rate = parseFloat(details.rate);
        if (!isNaN(rate) && rate > 0) setMarketRate(rate);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const walletUsd = profile?.wallet_balance ?? 0;
  const walletInr = walletUsd * marketRate;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold tracking-tight">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Wallet Balance" value={format(walletUsd)} icon={Wallet} />
        <StatCard title="Balance (INR)" value={`₹${walletInr.toFixed(2)}`} icon={IndianRupee} />
        <StatCard title="Market Rate" value={`₹${marketRate} / USDT`} icon={TrendingUp} />
        <StatCard title="Total Orders" value={stats.total} icon={ShoppingCart} />
        <StatCard title="Active Orders" value={stats.active} icon={Clock} />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle} />
      </div>
    </div>
  );
}