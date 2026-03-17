import { Package, ShoppingCart, Wallet, LogOut, MessageCircle, TicketCheck, UserCircle, LayoutDashboard } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencyToggle from "@/components/CurrencyToggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-small.webp";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "New Order", url: "/dashboard/services", icon: Package },
  { title: "Orders", url: "/dashboard/orders", icon: ShoppingCart },
  { title: "Add Funds", url: "/dashboard/funds", icon: Wallet },
  { title: "Tickets", url: "/dashboard/tickets", icon: TicketCheck },
  { title: "Contact", url: "/dashboard/contact", icon: MessageCircle },
  { title: "Account", url: "/dashboard/account", icon: UserCircle },
];

export default function UserSidebar() {
  const { signOut, profile } = useAuth();
  const { formatWallet } = useCurrency();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const balance = profile?.wallet_balance ?? 0;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <div className="px-4 py-4 mb-1 border-b border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="7smmpanel" className="h-7" />
                <span className="text-sm font-bold tracking-wide text-foreground">7smmpanel</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center py-3 mb-1 border-b border-sidebar-border">
              <img src={logo} alt="7smmpanel" className="h-7" />
            </div>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 space-y-2 border-t border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
            <span className="text-[11px] font-medium text-muted-foreground">Balance</span>
            <span className="text-sm font-bold text-foreground">{formatWallet(balance)}</span>
          </div>
        )}
        <div className="flex items-center justify-center gap-1">
          <CurrencyToggle />
          <ThemeToggle />
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
