
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  // If no profile exists, this is a problem that needs to be handled differently
  if (!profile) {
    return <LoginForm />;
  }

  if (requiredRole && !requiredRole.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
