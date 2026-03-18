import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/StatCard";
import { Users, ShoppingCart, DollarSign, Package, Server, CreditCard, AlertCircle } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0, totalOrders: 0, totalRevenue: 0, activeServices: 0,
    activeProviders: 0, pendingPayments: 0, failedOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [users, orders, services, providers, payments, failedOrders] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, amount"),
        supabase.from("public_services").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("providers").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("payment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "failed"),
      ]);
      const orderData = orders.data || [];
      const totalRevenue = orderData.reduce((sum, o) => sum + (o.amount || 0), 0);
      setStats({
        totalUsers: users.count || 0, totalOrders: orderData.length, totalRevenue,
        activeServices: services.count || 0, activeProviders: providers.count || 0,
        pendingPayments: payments.count || 0, failedOrders: failedOrders.count || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your panel activity</p>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} />
        <StatCard title="Total Orders" value={stats.totalOrders} icon={ShoppingCart} />
        <StatCard title="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} icon={DollarSign} />
        <StatCard title="Active Services" value={stats.activeServices} icon={Package} />
        <StatCard title="Active Providers" value={stats.activeProviders} icon={Server} />
        <StatCard title="Pending Payments" value={stats.pendingPayments} icon={CreditCard} description={stats.pendingPayments > 0 ? "Needs attention" : undefined} />
        <StatCard title="Failed Orders" value={stats.failedOrders} icon={AlertCircle} description={stats.failedOrders > 0 ? "Review required" : undefined} />
      </div>
    </div>
  );
}
