import { MessageCircle, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UserContact() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-xl mx-auto">
      <h2 className="text-xl font-bold tracking-tight">Contact Us</h2>
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5 text-primary" />
            Get in Touch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            For any questions, issues, or support requests, feel free to reach out to us on Telegram. We're available 24/7 to help you.
          </p>
          <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Telegram</p>
              <a
                href="https://t.me/paymentsupportsmm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-primary hover:underline"
              >
                @paymentsupportsmm
              </a>
            </div>
          </div>
          <Button asChild className="w-full">
            <a href="https://t.me/paymentsupportsmm" target="_blank" rel="noopener noreferrer">
              <Send className="h-4 w-4 mr-2" />
              Message on Telegram
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
