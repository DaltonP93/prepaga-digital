
import { useAuthContext } from '@/components/AuthProvider';
import { LoginForm } from '@/components/LoginForm';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
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
  
  // Always call useProfileCompletion to maintain consistent hook count
  const { isComplete } = useProfileCompletion();

  // All hooks must be called before any early returns
  useEffect(() => {
    if (user && profile && requireCompleteProfile && !isComplete && location.pathname !== '/profile') {
      navigate('/profile');
    }
  }, [user, profile, requireCompleteProfile, isComplete, location.pathname, navigate]);

  // Show loading spinner while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user, show login form
  if (!user) {
    return <LoginForm />;
  }

  // If user exists but no profile, show login form (this handles edge cases)
  if (!profile) {
    return <LoginForm />;
  }

  // Check role-based access
  if (requiredRole && !requiredRole.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Acceso Denegado</h1>
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
