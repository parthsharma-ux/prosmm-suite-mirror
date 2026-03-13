import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo-small.webp";

export default function Login() {
  const { user, role, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user && role) return <Navigate to={role === "admin" ? "/admin" : "/dashboard/services"} replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen auth-gradient-bg flex flex-col">
      {/* Top Nav */}
      <nav className="flex items-center justify-center gap-6 py-4 px-6 border-b border-border/30">
        <div className="flex items-center gap-2 mr-6">
          <img src={logo} alt="7smmpanel" className="h-7" />
          <span className="text-lg font-bold tracking-wide text-foreground">7smmpanel</span>
        </div>
        <Link to="/login" className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5 bg-secondary/50 px-3 py-1.5 rounded-md">
          Sign in
        </Link>
        <Link to="/register" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
          Create Account
        </Link>
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            SMM Panel - Cheapest Service Provider
          </h1>
          <p className="text-sm text-muted-foreground">
            100% Trusted And secure <span className="text-primary font-semibold">SMM Panel</span> we have only working services & 24 hour support available
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-lg bg-card rounded-xl border border-border/50 shadow-2xl p-6 md:p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="h-11 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="h-11 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div>
              <Link to="#" className="text-xs text-primary hover:underline font-medium">Forgot password?</Link>
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 rounded-lg"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Do not have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-semibold">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
