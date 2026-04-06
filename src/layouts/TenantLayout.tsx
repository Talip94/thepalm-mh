import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { Building2, LayoutDashboard, FileText, AlertTriangle, ListChecks, User, LogOut, Menu } from 'lucide-react';

const tenantNav = [
  { title: 'Dashboard', url: '/tenant', icon: LayoutDashboard },
  { title: 'Meine Dokumente', url: '/tenant/documents', icon: FileText },
  { title: 'Schaden melden', url: '/tenant/report', icon: AlertTriangle },
  { title: 'Meine Meldungen', url: '/tenant/issues', icon: ListChecks },
  { title: 'Profil', url: '/tenant/profile', icon: User },
];

function TenantSidebarContent() {
  const { signOut, tenantInfo } = useAuth();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const navigate = useNavigate();

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar">
        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-heading font-semibold text-sidebar-foreground truncate"><span className="underline">The Palm</span> <span className="font-normal text-sidebar-foreground/60 text-xs">Portal</span></p>
              {tenantInfo && (
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {tenantInfo.apartment_number}
                </p>
              )}
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs uppercase tracking-wider">
            Mieterbereich
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tenantNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/tenant'}
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto p-4">
          <button
            onClick={() => { signOut(); navigate('/login'); }}
            className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-full rounded-md hover:bg-sidebar-accent/50"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Abmelden</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <TenantSidebarContent />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card">
            <SidebarTrigger className="mr-4">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
