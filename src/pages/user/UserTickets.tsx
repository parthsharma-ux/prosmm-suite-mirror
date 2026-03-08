import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, MessageSquare } from "lucide-react";

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
  closed: "bg-muted text-muted-foreground",
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
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [user]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("tickets").insert({
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
    } as any);
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Support Tickets</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Ticket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Support Ticket</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <Textarea placeholder="Describe your issue..." value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : "Submit Ticket"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Subject</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No tickets yet</TableCell></TableRow>
            )}
            {tickets.map((t) => (
              <TableRow key={t.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="font-medium text-sm">{t.subject}</TableCell>
                <TableCell><Badge variant="outline" className={`capitalize ${statusColors[t.status] || ""}`}>{t.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setViewTicket(t)}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewTicket} onOpenChange={() => setViewTicket(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewTicket?.subject}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Your message</p>
              <p className="text-sm bg-muted/30 rounded-lg p-3">{viewTicket?.message}</p>
            </div>
            {viewTicket?.admin_reply && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Admin reply</p>
                <p className="text-sm bg-primary/5 border border-primary/20 rounded-lg p-3">{viewTicket.admin_reply}</p>
              </div>
            )}
            {!viewTicket?.admin_reply && viewTicket?.status === "open" && (
              <p className="text-xs text-muted-foreground text-center">Awaiting admin response...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
