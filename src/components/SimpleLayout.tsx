
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";
import { LogOut, User, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useRoutePermissions } from "@/hooks/useRoutePermissions";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  ShoppingBag, 
  FileImage, 
  Building2, 
  CreditCard, 
  UserCog, 
  Shield, 
  Workflow, 
  BarChart3, 
  Settings 
} from "lucide-react";

interface SimpleLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const SimpleLayout = ({ title, description, children }: SimpleLayoutProps) => {
  const { user, profile, signOut } = useSimpleAuthContext();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const permissions = useRoutePermissions();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Construir navegación basada en permisos
  const navigationItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
      permission: permissions.canViewDashboard
    },
    {
      title: "Ventas",
      url: "/sales",
      icon: ShoppingBag,
      permission: permissions.canViewSales
    },
    {
      title: "Clientes",
      url: "/clients",
      icon: Users,
      permission: permissions.canViewClients
    },
    {
      title: "Planes",
      url: "/plans",
      icon: CreditCard,
      permission: permissions.canViewPlans
    },
    {
      title: "Documentos",
      url: "/documents",
      icon: FileText,
      permission: permissions.canViewDocuments
    },
    {
      title: "Templates",
      url: "/templates",
      icon: FileImage,
      permission: permissions.canViewTemplates
    },
    {
      title: "Flujo de Firmas",
      url: "/signature-workflow",
      icon: Workflow,
      permission: permissions.canViewDocuments
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: BarChart3,
      permission: permissions.canViewAnalytics
    },
    {
      title: "Mi Perfil",
      url: "/profile",
      icon: User,
      permission: true // Todos pueden ver su perfil
    },
  ].filter(item => item.permission);

  const adminItems = [
    {
      title: "Usuarios",
      url: "/users",
      icon: UserCog,
      permission: permissions.canViewUsers
    },
    {
      title: "Empresas",
      url: "/companies",
      icon: Building2,
      permission: permissions.canViewCompanies
    },
    {
      title: "Auditoría",
      url: "/audit",
      icon: Shield,
      permission: permissions.canViewAudit
    },
    {
      title: "Configuración",
      url: "/experience",
      icon: Settings,
      permission: permissions.canViewExperience
    },
  ].filter(item => item.permission);

  const allNavigationItems = [...navigationItems, ...adminItems];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <h2 className="text-lg font-semibold">Seguro Digital</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <nav className="mt-4 px-2">
          <div className="space-y-1">
            {allNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.url;
              
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden mr-2"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{title}</h1>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline-block">
                  {profile?.first_name || user?.email}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="flex items-center space-x-1"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline-block">Salir</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
