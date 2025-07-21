
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
  
  const MAX_RETRIES = 2; // Reduced retries

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

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show loading states only when necessary
  if (loading && loadingStage === 'initializing') {
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

  // Show profile error only in critical cases
  if (!profile && !loading && loadingStage === 'error' && retryCount >= MAX_RETRIES) {
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
  if (requiredRole && requiredRole.length > 0 && profile) {
    if (!profile.role || !requiredRole.includes(profile.role)) {
      return (
        <RoleRestrictedCard
          userRole={profile.role}
          requiredRoles={requiredRole}
        />
      );
    }
  }

  // Allow access even if profile is still loading (non-blocking)
  return <>{children}</>;
};
