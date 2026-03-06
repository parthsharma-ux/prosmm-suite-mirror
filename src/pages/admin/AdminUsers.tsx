import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
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
      user_id: selectedUser.user_id,
      type: "adjustment" as const,
      amount: Math.abs(adjustAmount),
      description: adjustReason || `Admin adjustment: ${adjustAmount > 0 ? "+" : ""}${adjustAmount}`,
    });
    toast.success("Balance adjusted");
    setAdjustDialog(false);
    fetchUsers();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold tracking-tight">Users</h2>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {users.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users</TableCell></TableRow>}
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                <TableCell>${u.wallet_balance.toFixed(2)}</TableCell>
                <TableCell><Badge variant="outline" className={u.status === "active" ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"}>{u.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="outline" size="sm" onClick={() => toggleStatus(u)}>{u.status === "active" ? "Suspend" : "Activate"}</Button>
                  <Button variant="outline" size="sm" onClick={() => openAdjust(u)}>Adjust</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Wallet — {selectedUser?.name || selectedUser?.email}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Current balance: ${selectedUser?.wallet_balance.toFixed(2)}</p>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Amount (use negative to deduct)</Label><Input type="number" step="0.01" value={adjustAmount} onChange={(e) => setAdjustAmount(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Reason</Label><Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Adjustment reason" /></div>
            <Button onClick={handleAdjust} className="w-full">Apply Adjustment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
