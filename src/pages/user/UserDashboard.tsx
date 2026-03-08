import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import StatCard from "@/components/StatCard";
import { Wallet, ShoppingCart, CheckCircle, Clock } from "lucide-react";

export default function UserDashboard() {
  const { user, profile } = useAuth();
  const { formatWallet } = useCurrency();
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-6 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold tracking-tight">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Wallet Balance" value={formatWallet(profile?.wallet_balance ?? 0)} icon={Wallet} />
        <StatCard title="Total Orders" value={stats.total} icon={ShoppingCart} />
        <StatCard title="Active Orders" value={stats.active} icon={Clock} />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle} />
      </div>
    </div>
  );
}
