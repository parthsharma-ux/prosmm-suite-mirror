import { LayoutDashboard, Server, Package, ShoppingCart, CreditCard, Users, LogOut, Layers, Link2, Banknote, TicketCheck } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
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
import logo from "@/assets/logo-7smmpanel.jpg";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Providers", url: "/admin/providers", icon: Server },
  { title: "Categories", url: "/admin/categories", icon: Layers },
  { title: "Services", url: "/admin/services", icon: Package },
  { title: "API Mapping", url: "/admin/mapping", icon: Link2 },
  { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
  { title: "Payments", url: "/admin/payments", icon: CreditCard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Payment Settings", url: "/admin/payment-settings", icon: Banknote },
  { title: "Tickets", url: "/admin/tickets", icon: TicketCheck },
];

export default function AdminSidebar() {
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <div className="px-4 py-4 mb-1 border-b border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="7smmpanel" className="h-7" />
                <span className="text-sm font-bold tracking-wide text-foreground">Admin</span>
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
                      end={item.url === "/admin"}
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
        <div className="flex items-center justify-center">
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
