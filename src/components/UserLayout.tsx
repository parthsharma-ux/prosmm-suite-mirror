import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, ShoppingCart, Wallet, LogOut, Menu, MessageCircle, TicketCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencyToggle from "@/components/CurrencyToggle";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { title: "New Order", url: "/dashboard/services", icon: Package },
  { title: "Orders", url: "/dashboard/orders", icon: ShoppingCart },
  { title: "Add Funds", url: "/dashboard/funds", icon: Wallet },
  { title: "Tickets", url: "/dashboard/tickets", icon: TicketCheck },
  { title: "Contact", url: "/dashboard/contact", icon: MessageCircle },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

export default function UserLayout() {
  const { signOut, profile } = useAuth();
  const { format } = useCurrency();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (url: string) =>
    url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(url);

  const balance = profile?.wallet_balance ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 md:px-6 shrink-0 min-w-0">
        <div className="flex items-center gap-3 md:gap-8 min-w-0">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-card border-border">
              <div className="flex flex-col h-full">
                <div className="h-14 flex items-center px-4 border-b border-border">
                  <span className="text-sm font-bold tracking-tight text-foreground">7smmpanel</span>
                </div>
                <nav className="flex-1 py-3 px-2 space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.url}
                      to={item.url}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                        isActive(item.url)
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.title}
                    </Link>
                  ))}
                </nav>
                <div className="border-t border-border p-3 space-y-2">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted">
                    <span className="text-xs text-muted-foreground">Balance</span>
                    <span className="text-sm font-semibold text-foreground">{format(balance)}</span>
                  </div>
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-1">
                      <CurrencyToggle />
                      <ThemeToggle />
                    </div>
                    <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground gap-2">
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <span className="text-sm font-bold tracking-tight text-foreground shrink-0">SMM Panel</span>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.url}
                to={item.url}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive(item.url)
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="hidden md:block"><CurrencyToggle /></div>
          <div className="hidden md:block text-sm text-muted-foreground whitespace-nowrap">
            <span className="font-semibold text-foreground">{format(balance)}</span>
          </div>
          <div className="hidden md:block"><ThemeToggle /></div>
          <Button variant="ghost" size="sm" onClick={signOut} className="hidden md:flex text-muted-foreground px-2">
            <LogOut className="h-4 w-4" />
          </Button>
          {/* Mobile: balance + currency */}
          <div className="md:hidden flex items-center gap-2">
            <CurrencyToggle />
            <span className="text-xs font-semibold text-foreground whitespace-nowrap">{format(balance)}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
