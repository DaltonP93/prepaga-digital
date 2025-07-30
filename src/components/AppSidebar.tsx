
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  User,
  ShoppingBag,
  FileImage,
  Building2,
  CreditCard,
  UserCog,
  Shield,
  Workflow,
  BarChart3,
  Settings,
} from "lucide-react";

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

import { MainNavItem } from "@/types";
import { LogoutButton } from './LogoutButton';
import { useRoutePermissions } from '@/hooks/useRoutePermissions';

export function AppSidebar() {
  const location = useLocation();
  const permissions = useRoutePermissions();
  
  const menuItems: MainNavItem[] = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
      visible: permissions.canViewDashboard,
    },
    {
      title: "Ventas",
      url: "/sales",
      icon: ShoppingBag,
      visible: permissions.canViewSales,
    },
    {
      title: "Clientes",
      url: "/clients",
      icon: Users,
      visible: permissions.canViewClients,
    },
    {
      title: "Planes",
      url: "/plans",
      icon: CreditCard,
      visible: permissions.canViewPlans,
    },
    {
      title: "Documentos",
      url: "/documents",
      icon: FileText,
      visible: permissions.canViewDocuments,
    },
    {
      title: "Templates",
      url: "/templates",
      icon: FileImage,
      visible: permissions.canViewTemplates,
    },
    {
      title: "Flujo de Firmas",
      url: "/signature-workflow",
      icon: Workflow,
      visible: permissions.canViewDocuments,
    },
    {
      title: "Analytics", 
      url: "/analytics",
      icon: BarChart3,
      visible: permissions.canViewAnalytics,
    },
    {
      title: "Mi Perfil",
      url: "/profile",
      icon: User,
      visible: true, // Todos pueden ver su perfil
    },
  ].filter(item => item.visible);

  // Admin specific items
  const adminItems: MainNavItem[] = [
    {
      title: "Usuarios",
      url: "/users",
      icon: UserCog,
      visible: permissions.canViewUsers,
    },
    {
      title: "Empresas",
      url: "/companies",
      icon: Building2,
      visible: permissions.canViewCompanies,
    },
    {
      title: "Auditoría",
      url: "/audit",
      icon: Shield,
      visible: permissions.canViewAudit,
    },
    {
      title: "Configuración",
      url: "/experience",
      icon: Settings,
      visible: permissions.canViewExperience,
    }
  ].filter(item => item.visible);

  const allMenuItems = [...menuItems, ...adminItems];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-4">
          <h2 className="text-lg font-semibold">Seguro Digital</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2">
          <LogoutButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
