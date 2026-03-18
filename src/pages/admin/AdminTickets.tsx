import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TicketCheck, MessageSquare, Clock, CheckCircle, XCircle, Calendar, User } from "lucide-react";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

const statusConfig: Record<string, { bg: string; dot: string }> = {
  open: { bg: "bg-warning/10 text-warning border-warning/30", dot: "bg-warning" },
  answered: { bg: "bg-success/10 text-success border-success/30", dot: "bg-success" },
  closed: { bg: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
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
    const { error } = await (supabase as any).from("tickets").update({ admin_reply: reply.trim(), status: "answered", updated_at: new Date().toISOString() }).eq("id", selected.id);
    if (error) toast.error("Failed to reply");
    else { toast.success("Reply sent"); setSelected(null); setReply(""); fetchTickets(); }
    setSubmitting(false);
  };

  const closeTicket = async (id: string) => {
    await (supabase as any).from("tickets").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", id);
    toast.success("Ticket closed");
    fetchTickets();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-subtitle">Manage user support requests</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32 h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tickets.length === 0 ? (
        <div className="ecom-card p-12 text-center">
          <TicketCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No tickets</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {tickets.map((t) => {
            const cfg = statusConfig[t.status] || statusConfig.open;
            return (
              <div key={t.id} className="ecom-card-interactive p-5">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className={`capitalize text-[11px] font-semibold ${cfg.bg}`}>
                    <span className={`status-dot ${cfg.dot}`} />
                    {t.status}
                  </Badge>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>

                <h3 className="font-semibold text-sm text-foreground mb-1.5">{t.subject}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{t.message}</p>

                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-3">
                  <User className="h-3 w-3" />
                  <span className="font-mono">{t.user_id.slice(0, 8)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setSelected(t); setReply(t.admin_reply || ""); }} className="flex-1 h-8 text-xs rounded-lg">
                    <MessageSquare className="h-3 w-3 mr-1" /> Reply
                  </Button>
                  {t.status !== "closed" && (
                    <Button variant="ghost" size="sm" onClick={() => closeTicket(t.id)} className="h-8 text-xs">
                      <XCircle className="h-3 w-3 mr-1" /> Close
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-bold">{selected?.subject}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">User message</p>
              <p className="text-sm bg-muted/50 rounded-xl p-4 border border-border">{selected?.message}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Your reply</p>
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Type your reply..." className="rounded-lg" />
            </div>
            <Button onClick={handleReply} disabled={submitting} className="w-full font-semibold rounded-xl">
              {submitting ? "Sending..." : "Send Reply"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
