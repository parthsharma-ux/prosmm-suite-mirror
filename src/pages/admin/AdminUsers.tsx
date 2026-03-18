import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Mail, Wallet, Calendar, Shield, ShieldOff } from "lucide-react";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleStatus = async (u: Profile) => {
    const newStatus = u.status === "active" ? "suspended" : "active";
    await supabase.from("profiles").update({ status: newStatus as "active" | "suspended" }).eq("id", u.id);
    toast.success(`User ${newStatus}`);
    fetchUsers();
  };

  const openAdjust = (u: Profile) => { setSelectedUser(u); setAdjustAmount(0); setAdjustReason(""); setAdjustDialog(true); };

  const handleAdjust = async () => {
    if (!selectedUser || adjustAmount === 0) return;
    const newBalance = selectedUser.wallet_balance + adjustAmount;
    if (newBalance < 0) { toast.error("Balance cannot go negative"); return; }
    await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("id", selectedUser.id);
    await supabase.from("transactions").insert({
      user_id: selectedUser.user_id, type: "adjustment" as const,
      amount: Math.abs(adjustAmount),
      description: adjustReason || `Admin adjustment: ${adjustAmount > 0 ? "+" : ""}${adjustAmount}`,
    });
    toast.success("Balance adjusted");
    setAdjustDialog(false);
    fetchUsers();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">Manage user accounts and balances</p>
      </div>

      {users.length === 0 ? (
        <div className="ecom-card p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No users</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {users.map((u) => (
            <div key={u.id} className="ecom-card-interactive p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{(u.name || u.email)?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{u.name || "—"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] font-semibold capitalize ${u.status === "active" ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"}`}>
                  {u.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 mb-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                  <span className="font-bold text-foreground">${u.wallet_balance.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleStatus(u)} className="flex-1 h-8 text-xs rounded-lg">
                  {u.status === "active" ? <><ShieldOff className="h-3 w-3 mr-1" />Suspend</> : <><Shield className="h-3 w-3 mr-1" />Activate</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openAdjust(u)} className="flex-1 h-8 text-xs rounded-lg">
                  <Wallet className="h-3 w-3 mr-1" />Adjust
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-bold">Adjust Wallet — {selectedUser?.name || selectedUser?.email}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Current balance: <span className="font-semibold text-foreground">${selectedUser?.wallet_balance.toFixed(2)}</span></p>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount (use negative to deduct)</Label><Input type="number" step="0.01" value={adjustAmount} onChange={(e) => setAdjustAmount(Number(e.target.value))} className="h-11 rounded-lg" /></div>
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</Label><Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Adjustment reason" className="h-11 rounded-lg" /></div>
            <Button onClick={handleAdjust} className="w-full font-semibold rounded-xl">Apply Adjustment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
