import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo-7smmpanel.jpg";

export default function Login() {
  const { user, role, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

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
            <CardTitle className="text-xl font-bold">Welcome back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Password</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="h-10 pr-10"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-10 font-semibold" disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </span>
                )}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-5">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary font-medium hover:underline">
                Sign Up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
