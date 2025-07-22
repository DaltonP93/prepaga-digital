
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSessionManager } from "@/hooks/useSessionManager";
import { AuthLoadingState } from "@/components/auth/AuthLoadingState";
import { ProfileErrorCard } from "@/components/auth/ProfileErrorCard";
import { RoleRestrictedCard } from "@/components/auth/RoleRestrictedCard";
import { useRetryLogic } from "@/hooks/useRetryLogic";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { 
    user, 
    profile, 
    loading, 
    refreshProfile, 
    forceRefreshProfile, 
    signOut,
    connectionStatus,
    loadingStage,
    loadingProgress
  } = useAuth();
  
  const { isConnected, updateActivity } = useSessionManager(5, 30);
  const location = useLocation();
  
  const MAX_RETRIES = 2;

  const { retryCount, isRetrying, manualRetry, setIsRetrying } = useRetryLogic({
    maxRetries: MAX_RETRIES,
    onRetry: refreshProfile,
    shouldRetry: loadingStage === 'error' && !!user,
    resetTrigger: profile || !user
  });

  // Update activity when user interacts with protected routes
  useEffect(() => {
    if (user) {
      updateActivity();
    }
  }, [user, updateActivity, location.pathname]);

  console.log('🛡️ ProtectedRoute: Estado actual -', { 
    user: !!user, 
    loading, 
    loadingStage,
    hasProfile: !!profile
  });

  // Redirect to login if not authenticated
  if (!user) {
    console.log('🛡️ ProtectedRoute: No hay usuario, redirigiendo a login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Only show loading for critical initial states
  if (loading && loadingStage === 'initializing') {
    console.log('🛡️ ProtectedRoute: Mostrando loading state');
    
    const handleRetry = async () => {
      setIsRetrying(true);
      try {
        await refreshProfile();
      } finally {
        setIsRetrying(false);
      }
    };

    const handleForceRefresh = async () => {
      setIsRetrying(true);
      try {
        await forceRefreshProfile();
      } finally {
        setIsRetrying(false);
      }
    };

    return (
      <AuthLoadingState
        stage={isRetrying ? 'retrying' : loadingStage}
        progress={loadingProgress}
        retryCount={retryCount}
        maxRetries={MAX_RETRIES}
        isConnected={isConnected && connectionStatus === 'connected'}
        onRetry={handleRetry}
        onForceRefresh={handleForceRefresh}
        onSignOut={signOut}
        message={connectionStatus === 'disconnected' ? 'Sin conexión a internet' : undefined}
      />
    );
  }

  // Show profile error only in critical cases after max retries
  if (!profile && !loading && loadingStage === 'error' && retryCount >= MAX_RETRIES) {
    console.log('🛡️ ProtectedRoute: Error crítico de perfil');
    return (
      <ProfileErrorCard
        retryCount={retryCount}
        maxRetries={MAX_RETRIES}
        isConnected={isConnected}
        isRetrying={isRetrying}
        onRetry={manualRetry}
        onForceRefresh={async () => {
          setIsRetrying(true);
          try {
            await forceRefreshProfile();
          } finally {
            setIsRetrying(false);
          }
        }}
        onSignOut={signOut}
      />
    );
  }

  // Check role permissions only if profile is available and roles are required
  if (requiredRole && requiredRole.length > 0 && profile && profile.role) {
    if (!requiredRole.includes(profile.role)) {
      console.log('🛡️ ProtectedRoute: Rol no autorizado');
      return (
        <RoleRestrictedCard
          userRole={profile.role}
          requiredRoles={requiredRole}
        />
      );
    }
  }

  // Allow access - user is authenticated, let the app render
  console.log('✅ ProtectedRoute: Acceso permitido, renderizando children');
  return <>{children}</>;
};
