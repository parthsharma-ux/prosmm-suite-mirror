import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, MessageSquare, TicketCheck } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  open: "bg-warning/10 text-warning border-warning/30",
  answered: "bg-success/10 text-success border-success/30",
  closed: "bg-muted text-muted-foreground border-border",
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
    const { data } = await (supabase as any)
      .from("tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [user]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || !user) return;
    setSubmitting(true);
    const { error } = await (supabase as any).from("tickets").insert({
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
    });
    if (error) {
      toast.error("Failed to create ticket");
    } else {
      toast.success("Ticket created");
      setSubject("");
      setMessage("");
      setOpen(false);
      fetchTickets();
    }
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Support Tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Get help from our support team</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="font-semibold"><Plus className="h-4 w-4 mr-1" />New Ticket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-bold">Create Support Ticket</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10" />
              <Textarea placeholder="Describe your issue..." value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
              <Button onClick={handleSubmit} disabled={submitting} className="w-full font-semibold">
                {submitting ? "Submitting..." : "Submit Ticket"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card overflow-hidden">
        <div className="table-wrapper">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-xs">Subject</TableHead>
                <TableHead className="font-semibold text-xs">Status</TableHead>
                <TableHead className="font-semibold text-xs">Date</TableHead>
                <TableHead className="font-semibold text-xs text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                    <TicketCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No tickets yet</p>
                  </TableCell>
                </TableRow>
              )}
              {tickets.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium text-sm">{t.subject}</TableCell>
                  <TableCell><Badge variant="outline" className={`capitalize text-[11px] font-semibold ${statusColors[t.status] || ""}`}>{t.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setViewTicket(t)} className="h-7">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!viewTicket} onOpenChange={() => setViewTicket(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-bold">{viewTicket?.subject}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Your message</p>
              <p className="text-sm bg-muted/50 rounded-lg p-3 border border-border">{viewTicket?.message}</p>
            </div>
            {viewTicket?.admin_reply && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Admin reply</p>
                <p className="text-sm bg-primary/5 border border-primary/20 rounded-lg p-3">{viewTicket.admin_reply}</p>
              </div>
            )}
            {!viewTicket?.admin_reply && viewTicket?.status === "open" && (
              <p className="text-xs text-muted-foreground text-center py-2">Awaiting admin response...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
