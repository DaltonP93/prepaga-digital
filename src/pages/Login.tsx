
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '@/components/LoginForm';
import { useAuthContext } from '@/components/AuthProvider';

const Login = () => {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🔄 Login: Checking auth state -', { 
      user: !!user, 
      loading,
      hasUserId: user?.id ? true : false
    });

    // If user is authenticated, redirect immediately
    if (user && !loading) {
      const from = location.state?.from?.pathname || '/';
      console.log('✅ Login: Usuario autenticado, navegando a:', from);
      
      // Use replace to avoid back button issues
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location.state]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Don't show anything if user is authenticated (navigation in progress)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Show login form only if user is not authenticated
  return <LoginForm />;
};

export default Login;
