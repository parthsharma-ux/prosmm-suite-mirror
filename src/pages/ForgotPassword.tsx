import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo-7smmpanel.jpg";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("Password reset link sent to your email!");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:auth-gradient-bg p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="7smmpanel" className="h-8" />
            <span className="text-lg font-bold text-foreground">7smmpanel</span>
          </div>
        </div>

        <Card className="border-border bg-card shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-bold">Forgot Password</CardTitle>
            <CardDescription>
              {sent
                ? "Check your email for a password reset link"
                : "Enter your email to receive a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  We've sent a password reset link to <strong>{email}</strong>. Please check your inbox.
                </p>
                <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                  Send again
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="h-10"
                  />
                </div>
                <Button type="submit" className="w-full h-10 font-semibold" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Sending…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Send Reset Link
                    </span>
                  )}
                </Button>
              </form>
            )}
            <p className="text-center text-sm text-muted-foreground mt-5">
              <Link to="/login" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Back to Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
