import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useSidebar } from "@/components/SidebarProvider";
import { useAuthContext } from "@/components/AuthProvider";
import { useSignOut } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  LayoutDashboard,
  Settings,
  User,
  HelpCircle,
  LogOut,
  Plus,
  FileText,
  Mail,
  Bell,
  CheckSquare,
  Package,
  KanbanSquare,
  LucideIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export function AppSidebar() {
  const { profile } = useAuthContext();
  const location = useLocation();
  const { collapsed } = useSidebar();
  const signOut = useSignOut();

  const handleSignOut = async () => {
    await signOut.mutateAsync();
  };

  const navigationItems: NavItem[] = [
    {
      name: "Inicio",
      href: "/",
      icon: Home,
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Ventas",
      href: "/sales",
      icon: Package,
    },
    {
      name: "Flujo de Firmas",
      href: "/signature-workflow",
      icon: FileText,
    },
    {
      name: "Campañas",
      href: "/campaigns",
      icon: Mail,
    },
    {
      name: "Leads",
      href: "/leads",
      icon: Users,
    },
    {
      name: "Planes",
      href: "/plans",
      icon: CheckSquare,
    },
    {
      name: "Templates",
      href: "/templates",
      icon: KanbanSquare,
    },
  ];

  // Add API Configuration for admin and super_admin
  if (profile?.role === 'admin' || profile?.role === 'super_admin') {
    navigationItems.push({
      name: "Configuración API",
      href: "/api-config",
      icon: Settings,
    });
  }

  return (
    <div className="flex flex-col h-full space-y-2 w-full">
      <div className="px-3 py-2 flex justify-between items-center">
        <span className="font-bold">Menú</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Bell className="h-4 w-4" />
              <Badge
                variant="primary"
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full"
              >
                2
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80">
            <DropdownMenuItem>
              <p>
                <b>Nueva venta</b> asignada a{" "}
                <a href="#" className="underline">
                  Juan Pérez
                </a>
              </p>
              <DropdownMenuSeparator />
            </DropdownMenuItem>
            <DropdownMenuItem>
              <p>
                <b>Recordatorio:</b> Llamar a{" "}
                <a href="#" className="underline">
                  María Gómez
                </a>{" "}
                para seguimiento
              </p>
              <DropdownMenuSeparator />
            </DropdownMenuItem>
            <DropdownMenuItem>
              <p>
                <b>Documento firmado</b> por{" "}
                <a href="#" className="underline">
                  Carlos López
                </a>
              </p>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Separator />
      <ScrollArea className="flex-1 space-y-2">
        <div className="flex flex-col space-y-1">
          {navigationItems.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              className={`w-full justify-start font-normal ${
                location.pathname === item.href ? "bg-secondary" : ""
              }`}
              onClick={() => (window.location.href = item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.name}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
      <Separator />
      <div className="px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-full justify-start px-2">
              <Avatar className="mr-2 h-6 w-6">
                <AvatarImage src="/avatars/01.png" alt="Avatar" />
                <AvatarFallback>OM</AvatarFallback>
              </Avatar>
              <span className="font-normal">
                {profile?.first_name} {profile?.last_name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end" forceMount>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Mi Perfil</span>
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Soporte</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Salir</span>
              <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
