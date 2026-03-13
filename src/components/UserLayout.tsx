import { Outlet, Link, useLocation } from "react-router-dom";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, Wallet, LogOut, Menu, MessageCircle, TicketCheck, UserCircle, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencyToggle from "@/components/CurrencyToggle";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/logo-small.webp";

const navItems = [
  { title: "New Order", url: "/dashboard/services", icon: Package },
  { title: "Orders", url: "/dashboard/orders", icon: ShoppingCart },
  { title: "Add Funds", url: "/dashboard/funds", icon: Wallet },
  { title: "Tickets", url: "/dashboard/tickets", icon: TicketCheck },
  { title: "Contact", url: "/dashboard/contact", icon: MessageCircle },
  { title: "Account", url: "/dashboard/account", icon: UserCircle },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

export default function UserLayout() {
  const { signOut, profile } = useAuth();
  const { formatWallet } = useCurrency();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (url: string) =>
    url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(url);

  const balance = profile?.wallet_balance ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* Top Navigation Bar - xmedia style */}
      <header className="border-b border-border/40 bg-card/80 backdrop-blur-sm shrink-0 min-w-0">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-8 w-8 text-muted-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-card border-border" aria-describedby={undefined}>
                <VisuallyHidden><span>Navigation Menu</span></VisuallyHidden>
                <div className="flex flex-col h-full">
                  <div className="h-14 flex items-center gap-2 px-4 border-b border-border">
                    <img src={logo} alt="7smmpanel" className="h-6" />
                    <span className="text-sm font-bold tracking-wide text-foreground">7smmpanel</span>
                  </div>
                  <nav className="flex-1 py-3 px-2 space-y-0.5">
                    {navItems.map((item) => (
                      <Link
                        key={item.url}
                        to={item.url}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                          isActive(item.url)
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.title}
                      </Link>
                    ))}
                  </nav>
                  <div className="border-t border-border p-3 space-y-2">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary">
                      <span className="text-xs text-muted-foreground">Balance</span>
                      <span className="text-sm font-bold text-foreground">{formatWallet(balance)}</span>
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

            <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
              <img src={logo} alt="7smmpanel" className="h-6 md:h-7" />
              <span className="text-sm md:text-base font-bold tracking-wide text-foreground whitespace-nowrap">7smmpanel</span>
            </Link>

            <nav className="hidden md:flex items-center gap-0.5 ml-4">
              {navItems.map((item) => (
                <Link
                  key={item.url}
                  to={item.url}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors uppercase tracking-wide",
                    isActive(item.url)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="hidden md:block"><CurrencyToggle /></div>
            <div className="hidden md:flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-lg">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-bold text-foreground whitespace-nowrap">{formatWallet(balance)}</span>
            </div>
            <div className="hidden md:block"><ThemeToggle /></div>
            <Button variant="ghost" size="sm" onClick={signOut} className="hidden md:flex text-muted-foreground px-2 hover:text-primary">
              <LogOut className="h-4 w-4" />
            </Button>
            {/* Mobile: balance + currency */}
            <div className="md:hidden flex items-center gap-2">
              <CurrencyToggle />
              <span className="text-xs font-bold text-foreground whitespace-nowrap">{formatWallet(balance)}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
