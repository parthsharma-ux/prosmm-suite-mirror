import { MessageCircle, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function UserContact() {
  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Contact Us</h1>
        <p className="page-subtitle">We're here to help 24/7</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="ecom-card-interactive p-6">
          <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
            <Send className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Telegram</h3>
          <p className="text-xs text-muted-foreground mb-4">Chat with us instantly on Telegram</p>
          <a href="https://t.me/paymentsupportsmm" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">
            @paymentsupportsmm
          </a>
        </div>

        <div className="ecom-card p-6">
          <div className="p-3 rounded-xl bg-success/10 w-fit mb-4">
            <Clock className="h-6 w-6 text-success" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">24/7 Support</h3>
          <p className="text-xs text-muted-foreground mb-4">We respond within minutes, any time of day</p>
          <Badge className="bg-success/10 text-success border-0 text-xs font-semibold">Always Online</Badge>
        </div>
      </div>

      <div className="ecom-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Quick Contact</h3>
            <p className="text-xs text-muted-foreground">Reach out for any questions or support</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          For any questions, issues, or support requests, feel free to reach out to us on Telegram. We're available 24/7 to help you with orders, payments, and any other concerns.
        </p>
        <Button asChild className="w-full font-semibold rounded-xl h-11 shadow-lg shadow-primary/20">
          <a href="https://t.me/paymentsupportsmm" target="_blank" rel="noopener noreferrer">
            <Send className="h-4 w-4 mr-2" />
            Message on Telegram
          </a>
        </Button>
      </div>
    </div>
  );
}
