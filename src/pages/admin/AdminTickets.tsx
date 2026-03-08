import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  open: "bg-warning/10 text-warning border-warning/30",
  answered: "bg-success/10 text-success border-success/30",
  closed: "bg-muted text-muted-foreground",
};

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    let q = (supabase as any).from("tickets").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [filter]);

  const handleReply = async () => {
    if (!selected || !reply.trim()) return;
    setSubmitting(true);
    const { error } = await (supabase as any)
      .from("tickets")
      .update({ admin_reply: reply.trim(), status: "answered", updated_at: new Date().toISOString() })
      .eq("id", selected.id);
    if (error) {
      toast.error("Failed to reply");
    } else {
      toast.success("Reply sent");
      setSelected(null);
      setReply("");
      fetchTickets();
    }
    setSubmitting(false);
  };

  const closeTicket = async (id: string) => {
    await (supabase as any).from("tickets").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", id);
    toast.success("Ticket closed");
    fetchTickets();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Support Tickets</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No tickets</TableCell></TableRow>
            )}
            {tickets.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium text-sm">{t.subject}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{t.user_id.slice(0, 8)}</TableCell>
                <TableCell><Badge variant="outline" className={`capitalize ${statusColors[t.status] || ""}`}>{t.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="outline" size="sm" onClick={() => { setSelected(t); setReply(t.admin_reply || ""); }}>Reply</Button>
                  {t.status !== "closed" && <Button variant="ghost" size="sm" onClick={() => closeTicket(t.id)}>Close</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected?.subject}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">User message</p>
              <p className="text-sm bg-muted/30 rounded-lg p-3">{selected?.message}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Your reply</p>
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Type your reply..." />
            </div>
            <Button onClick={handleReply} disabled={submitting} className="w-full">
              {submitting ? "Sending..." : "Send Reply"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
