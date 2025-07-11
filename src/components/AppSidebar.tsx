import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  User,
  ShoppingBag,
  Template,
} from "lucide-react";

import { MainNavItem } from "@/types";

interface AppSidebarProps {
  isSuperAdmin: boolean;
}

export function AppSidebar({ isSuperAdmin }: AppSidebarProps) {
  const menuItems: MainNavItem[] = [
    {
      title: "Dashboard",
      url: "/dashboard",
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
      title: "Documentos",
      url: "/documents",
      icon: FileText,
    },
    {
      title: "Templates",
      url: "/templates",
      icon: Template,
    },
    {
      title: "Mi Perfil",
      url: "/profile",
      icon: User,
    },
  ];

  if (isSuperAdmin) {
    menuItems.push({
      title: "Configuración",
      url: "/settings",
      icon: Settings,
    });
  }

  return (
    <div className="flex flex-col space-y-1">
      {menuItems.map((item) => (
        <a
          key={item.title}
          href={item.url}
          className="flex items-center space-x-2 rounded-md p-2 hover:bg-secondary hover:text-accent-foreground"
        >
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </a>
      ))}
    </div>
  );
}
