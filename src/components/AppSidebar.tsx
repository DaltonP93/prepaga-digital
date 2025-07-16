
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  User,
  ShoppingBag,
  FileImage,
  Building2,
  CreditCard,
  UserCog,
  Shield,
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
} from "@/components/ui/sidebar";

import { MainNavItem } from "@/types";

interface AppSidebarProps {
  isSuperAdmin?: boolean;
}

export function AppSidebar({ isSuperAdmin = false }: AppSidebarProps) {
  const location = useLocation();
  
  const menuItems: MainNavItem[] = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Ventas",
      url: "/sales",
      icon: ShoppingBag,
    },
    {
      title: "Clientes",
      url: "/clients",
      icon: Users,
    },
    {
      title: "Planes",
      url: "/plans",
      icon: CreditCard,
    },
    {
      title: "Documentos",
      url: "/documents",
      icon: FileText,
    },
    {
      title: "Templates",
      url: "/templates",
      icon: FileImage,
    },
    {
      title: "Mi Perfil",
      url: "/profile",
      icon: User,
    },
  ];

  // Admin specific items
  if (isSuperAdmin) {
    menuItems.push(
      {
        title: "Usuarios",
        url: "/users",
        icon: UserCog,
      },
      {
        title: "Empresas",
        url: "/companies",
        icon: Building2,
      },
      {
        title: "Auditoría",
        url: "/audit",
        icon: Shield,
      }
    );
  }

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
              {menuItems.map((item) => (
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
    </Sidebar>
  );
}
