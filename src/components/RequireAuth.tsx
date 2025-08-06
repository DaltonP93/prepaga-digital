
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/components/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";

interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const { user, loading, loadingStage } = useAuthContext();
  const location = useLocation();

  console.log('🔒 RequireAuth: Verificando acceso', { 
    user: !!user, 
    loading, 
    loadingStage,
    pathname: location.pathname 
  });

  // Mostrar loading mientras se inicializa la autenticación
  if (loading || loadingStage === 'initializing' || loadingStage === 'loading_profile') {
    console.log('⏳ RequireAuth: Mostrando loading...', { loading, loadingStage });
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md mx-auto p-4">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-10 w-full mt-8" />
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    console.log('❌ RequireAuth: Usuario no autenticado, redirigiendo a login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si hay usuario, mostrar el contenido protegido
  console.log('✅ RequireAuth: Usuario autenticado, mostrando contenido protegido');
  return <>{children}</>;
};

export default RequireAuth;
