
import { 
  Building2, 
  Users, 
  ClipboardList, 
  FileText, 
  Database, 
  ShoppingCart, 
  PenTool,
  BarChart3,
  Settings,
  Home,
  LogOut
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuthContext } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home, roles: ['super_admin', 'admin', 'gestor', 'vendedor'] },
  { title: "Empresas", url: "/companies", icon: Building2, roles: ['super_admin', 'admin'] },
  { title: "Usuarios", url: "/users", icon: Users, roles: ['super_admin', 'admin'] },
  { title: "Planes", url: "/plans", icon: ClipboardList, roles: ['super_admin', 'admin', 'gestor'] },
  { title: "Templates", url: "/templates", icon: FileText, roles: ['super_admin', 'admin', 'gestor'] },
  { title: "Documentos", url: "/documents", icon: Database, roles: ['super_admin', 'admin', 'gestor', 'vendedor'] },
  { title: "Ventas", url: "/sales", icon: ShoppingCart, roles: ['super_admin', 'admin', 'gestor', 'vendedor'] },
];

export function AppSidebar() {
  const { profile, signOut } = useAuthContext();

  const filteredMenuItems = menuItems.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  return (
    <Sidebar className="border-r bg-sidebar">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
            <PenTool className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Seguro Digital</span>
            <span className="text-xs text-muted-foreground">Sistema de Firma</span>
          </div>
        </div>
        {profile && (
          <div className="mt-2 p-2 bg-muted rounded-md">
            <p className="text-sm font-medium">{profile.first_name} {profile.last_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile.role.replace('_', ' ')}</p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gestión Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) =>
                        `flex items-center gap-2 ${
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Herramientas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <BarChart3 className="h-4 w-4" />
                  <span>Reportes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings className="h-4 w-4" />
                  <span>Configuración</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button variant="outline" onClick={signOut} className="w-full">
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
