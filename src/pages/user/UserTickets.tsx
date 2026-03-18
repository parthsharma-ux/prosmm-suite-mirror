import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, MessageSquare, TicketCheck, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

const statusConfig: Record<string, { bg: string; dot: string; icon: any }> = {
  open: { bg: "bg-warning/10 text-warning border-warning/30", dot: "bg-warning", icon: Clock },
  answered: { bg: "bg-success/10 text-success border-success/30", dot: "bg-success", icon: CheckCircle },
  closed: { bg: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground", icon: XCircle },
};

export default function UserTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);

  const fetchTickets = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [user]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || !user) return;
    setSubmitting(true);
    const { error } = await (supabase as any).from("tickets").insert({ user_id: user.id, subject: subject.trim(), message: message.trim() });
    if (error) toast.error("Failed to create ticket");
    else { toast.success("Ticket created"); setSubject(""); setMessage(""); setOpen(false); fetchTickets(); }
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-subtitle">Get help from our support team</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="font-semibold rounded-lg shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-1" />New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-bold">Create Support Ticket</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-11 rounded-lg" />
              <Textarea placeholder="Describe your issue..." value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="rounded-lg" />
              <Button onClick={handleSubmit} disabled={submitting} className="w-full font-semibold rounded-xl">
                {submitting ? "Submitting..." : "Submit Ticket"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tickets.length === 0 ? (
        <div className="ecom-card p-12 text-center">
          <TicketCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">No tickets yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a ticket if you need help</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {tickets.map((t) => {
            const cfg = statusConfig[t.status] || statusConfig.open;
            return (
              <div key={t.id} className="ecom-card-interactive p-5 cursor-pointer" onClick={() => setViewTicket(t)}>
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
                <p className="text-xs text-muted-foreground line-clamp-2">{t.message}</p>
                {t.admin_reply && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[11px] text-success font-medium flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Admin replied
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewTicket} onOpenChange={() => setViewTicket(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-bold">{viewTicket?.subject}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Your message</p>
              <p className="text-sm bg-muted/50 rounded-xl p-4 border border-border">{viewTicket?.message}</p>
            </div>
            {viewTicket?.admin_reply && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Admin reply</p>
                <p className="text-sm bg-primary/5 border border-primary/20 rounded-xl p-4">{viewTicket.admin_reply}</p>
              </div>
            )}
            {!viewTicket?.admin_reply && viewTicket?.status === "open" && (
              <p className="text-xs text-muted-foreground text-center py-3">Awaiting admin response...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
