
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
import { useBranding } from './CompanyBrandingProvider';
import { useState } from 'react';

export function AppSidebar() {
  const location = useLocation();
  const permissions = useRoutePermissions();
  const { logoUrl, companyName } = useBranding();
  const [logoBroken, setLogoBroken] = useState(false);

  const menuItems: MainNavItem[] = [
    {
      title: "Dashboard",
      url: "/dashboard",
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
      title: "Auditoría",
      url: "/audit",
      icon: Shield,
      visible: permissions.canViewAudit,
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
      visible: true,
    },
  ].filter(item => item.visible);

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
      title: "Configuración",
      url: "/settings",
      icon: Settings,
      visible: permissions.canViewSettings,
    }
  ].filter(item => item.visible);

  const allMenuItems = [...menuItems, ...adminItems];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-4">
          {logoUrl && !logoBroken ? (
            <div className="flex items-center gap-2">
              <img
                src={logoUrl}
                alt={companyName}
                className="h-8 max-w-[120px] object-contain"
                onError={() => setLogoBroken(true)}
              />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground tracking-tight truncate">
                  {companyName || 'SAMAP Digital'}
                </h2>
                <p className="text-xs text-muted-foreground">Gestión comercial médica</p>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground tracking-tight">
                {companyName || 'SAMAP Digital'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Gestión comercial médica</p>
            </>
          )}
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
