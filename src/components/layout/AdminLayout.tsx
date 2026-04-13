import { Outlet, useNavigate } from "react-router-dom";
import {
  SidebarProvider,
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Upload, FileStack, ClipboardCheck, BarChart3, Mail, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Upload Template", url: "/admin/upload", icon: Upload },
  { title: "My Templates", url: "/admin/templates", icon: FileStack },
  { title: "Submissions", url: "/admin/submissions", icon: ClipboardCheck },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Bulk Messaging", url: "/admin/messaging", icon: Mail },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="pt-4">
        <div className={`px-4 mb-6 ${collapsed ? "px-2" : ""}`}>
          {collapsed ? (
            <span className="font-display text-lg font-bold text-gradient-orange block text-center">D</span>
          ) : (
            <div className="flex items-center gap-2">
              <img src="/docflow-logo.svg" alt="DocFlow" className="h-10 w-auto max-w-full" />
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Admin</Badge>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            {!collapsed && "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin/dashboard"}
                      className="hover:bg-accent/50 transition-colors rounded-lg"
                      activeClassName="bg-accent text-primary font-medium border-l-[3px] border-primary"
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && profile && (
          <div className="card-surface p-3 mb-3">
            <p className="text-sm font-medium text-foreground truncate">{profile.full_name || "Admin"}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.department || "Faculty"}</p>
          </div>
        )}
        <SidebarMenuButton onClick={handleSignOut} className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && <span>Sign Out</span>}
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 shrink-0 bg-card">
            <SidebarTrigger className="mr-4" />
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-medium">
              Faculty / Admin
            </Badge>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
