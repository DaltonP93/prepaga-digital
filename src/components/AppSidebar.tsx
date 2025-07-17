import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import {
  BarChart3,
  Bell,
  Book,
  Calendar,
  CheckCircle2,
  ChevronDown,
  File,
  FileText,
  FolderKanban,
  Home,
  LayoutDashboard,
  ListChecks,
  Mail,
  MessageSquare,
  Plus,
  Settings,
  ShoppingBag,
  Tag,
  User,
  Users,
  LogOut,
} from "lucide-react"

import { useAuthContext } from '@/components/AuthProvider';

export function AppSidebar() {
  const { toast } = useToast()
  const user = {
    name: "Emerson Silva",
    email: "emerson.silva@example.com",
    image: "/images/avatars/01.png",
  }

  const navigation = [
    {
      title: "General",
      items: [
        {
          title: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Ventas",
          href: "/sales",
          icon: ShoppingBag,
        },
        {
          title: "Flujo de Firmas",
          href: "/signature-workflow",
          icon: FileText,
        },
        {
          title: "Clientes",
          href: "/clients",
          icon: Users,
        },
      ],
    },
    {
      title: "Administración",
      items: [
        {
          title: "Templates",
          href: "/templates",
          icon: File,
        },
        {
          title: "Compañias",
          href: "/companies",
          icon: Book,
        },
        {
          title: "Planes",
          href: "/plans",
          icon: ListChecks,
        },
        {
          title: "Usuarios",
          href: "/users",
          icon: User,
        },
        {
          title: "Configuración",
          href: "/settings",
          icon: Settings,
        },
      ],
    },
  ]

  const { signOut } = useAuthContext();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center space-x-2">
          <Avatar>
            <AvatarImage src={user.image} alt={user.name} />
            <AvatarFallback>OM</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{user.name}</h3>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton href={item.href} tooltip={item.title}>
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
        
        {/* Separador antes del botón de cerrar sesión */}
        <SidebarSeparator />
        
        {/* Elemento de menú para cerrar sesión al final */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={signOut}
              tooltip="Cerrar sesión"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
