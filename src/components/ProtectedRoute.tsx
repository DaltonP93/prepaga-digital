
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";
import { useSessionManager } from "@/hooks/useSessionManager";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, profile, loading } = useSimpleAuthContext();
  const { updateActivity } = useSessionManager(5, 30);
  const location = useLocation();
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // Fetch user role from user_roles table
  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setLoadingRole(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!error && data) {
          setUserRole(data.role);
        }
      } catch (err) {
        console.error('Error fetching role:', err);
      } finally {
        setLoadingRole(false);
      }
    };

    fetchRole();
  }, [user]);

  // Update activity when user interacts with protected routes
  useEffect(() => {
    if (user) {
      updateActivity();
    }
  }, [user, updateActivity, location.pathname]);

  console.log('🛡️ ProtectedRoute: Estado actual -', { 
    user: !!user, 
    loading, 
    hasProfile: !!profile,
    userRole,
    pathname: location.pathname
  });

  // Show loading during initial auth check
  if (loading || loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('🛡️ ProtectedRoute: No hay usuario, redirigiendo a login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role permissions if required
  if (requiredRole && requiredRole.length > 0 && userRole) {
    if (!requiredRole.includes(userRole)) {
      console.log('🛡️ ProtectedRoute: Rol no autorizado');
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
          </div>
        </div>
      );
    }
  }

  // Allow access - user is authenticated
  console.log('✅ ProtectedRoute: Acceso permitido, renderizando children');
  return <>{children}</>;
};
