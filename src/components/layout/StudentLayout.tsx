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
import { LayoutDashboard, FileEdit, FolderCheck, UserCircle, Settings, LogOut, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard", url: "/student/dashboard", icon: LayoutDashboard },
  { title: "Fill New Document", url: "/student/fill", icon: FileEdit },
  { title: "My Completed Docs", url: "/student/completed", icon: FolderCheck },
  { title: "Messages", url: "/student/messages", icon: Mail },
  { title: "My Profile", url: "/student/profile", icon: UserCircle },
  { title: "Settings", url: "/student/settings", icon: Settings },
];

function StudentSidebar() {
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
            <button type="button" onClick={() => navigate("/")} className="mx-auto block">
              <img src="/favicon.svg" alt="DocFlow" className="h-8 w-8 sm:h-9 sm:w-9" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => navigate("/")} className="flex items-center justify-start">
                <img src="/docflow-logo.svg" alt="DocFlow" className="h-9 w-auto max-w-full" />
              </button>
              <Badge variant="outline" className="text-[10px] border-muted-foreground/30">Student</Badge>
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
                      end={item.url === "/student/dashboard"}
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
            <p className="text-sm font-medium text-foreground truncate">{profile.full_name || "Student"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {profile.department || ""}{profile.semester ? ` · Sem ${profile.semester}` : ""}
            </p>
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

export default function StudentLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StudentSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 shrink-0 bg-card">
            <SidebarTrigger className="mr-4" />
            <Badge variant="outline" className="text-xs font-medium border-muted-foreground/30">
              Student
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
