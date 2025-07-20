
import { useAuthContext } from '@/components/AuthProvider';
import { LoginForm } from '@/components/LoginForm';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  requireCompleteProfile?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  requireCompleteProfile = false
}) => {
  const { user, profile, loading } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileTimeout, setProfileTimeout] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Always call useProfileCompletion to maintain consistent hook count
  const { isComplete } = useProfileCompletion();

  // Handle profile completion redirect
  useEffect(() => {
    if (user && profile && requireCompleteProfile && !isComplete && location.pathname !== '/profile') {
      console.log('🔄 Redirecting to profile completion');
      navigate('/profile');
    }
  }, [user, profile, requireCompleteProfile, isComplete, location.pathname, navigate]);

  // Handle profile loading timeout
  useEffect(() => {
    if (user && !profile && !loading) {
      const timer = setTimeout(() => {
        console.log('⏰ Profile loading timeout reached');
        setProfileTimeout(true);
      }, 5000); // 5 second timeout

      return () => clearTimeout(timer);
    } else {
      setProfileTimeout(false);
    }
  }, [user, profile, loading]);

  // Show loading spinner while auth is being determined
  if (loading) {
    console.log('⏳ ProtectedRoute: Auth loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // If no user, show login form
  if (!user) {
    console.log('🚪 ProtectedRoute: No user, showing login');
    return <LoginForm />;
  }

  // If user exists but no profile and profile loading timed out
  if (user && !profile && profileTimeout) {
    console.warn('⚠️ ProtectedRoute: Profile loading timed out');
    
    const handleRetry = () => {
      setProfileTimeout(false);
      setRetryCount(prev => prev + 1);
      window.location.reload();
    };

    const handleForceLogout = () => {
      console.log('🚪 Force logout due to profile error');
      window.location.href = '/';
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-foreground">Error de Perfil</h1>
          <p className="text-muted-foreground">
            No se pudo cargar el perfil de usuario después de {retryCount} intentos.
          </p>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={handleRetry} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Reintentar ({retryCount}/3)
            </button>
            {retryCount >= 2 && (
              <button 
                onClick={handleForceLogout} 
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
              >
                Cerrar Sesión
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (requiredRole && profile && !requiredRole.includes(profile.role)) {
    console.warn('🚫 ProtectedRoute: Access denied for role:', profile.role);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Acceso Denegado</h1>
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  console.log('✅ ProtectedRoute: Access granted');
  return <>{children}</>;
};
