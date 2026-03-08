import { LayoutDashboard, BookOpen, Target, CalendarDays, LogOut } from "lucide-react";
import { NavLink } from "@/components/Navlink";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Study Log", url: "/log", icon: BookOpen },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Schedule", url: "/schedule", icon: CalendarDays },
];

export function AppSidebar() {
  const { user, logout } = useAuth();

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-zinc-800 bg-[#18181b] text-zinc-300"
    >
      <SidebarHeader className="border-b border-zinc-800/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white text-sm font-bold shadow-[0_0_12px_rgba(124,58,237,0.4)]">
            S
          </div>
          <span className="text-sm font-bold text-zinc-100 tracking-wide group-data-[collapsible=icon]:hidden">
            Smart OS
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="pt-4">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-all duration-200 hover:bg-zinc-800/50 hover:text-zinc-100"
                      activeClassName="bg-[#7c3aed]/10 text-[#7c3aed] font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-zinc-800/50 p-4">
        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0 border border-zinc-700">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback className="bg-zinc-800 text-[#7c3aed] text-xs font-bold">
                {user.displayName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium text-zinc-200 truncate">
                {user.displayName}
              </p>
              <p className="text-[10px] text-zinc-500 truncate">
                {user.email}
              </p>
            </div>
            <button
              onClick={logout}
              className="text-zinc-500 hover:text-red-400 transition-colors shrink-0 group-data-[collapsible=icon]:hidden"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}