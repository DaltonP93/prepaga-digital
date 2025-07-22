
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '@/components/LoginForm';
import { useAuthContext } from '@/components/AuthProvider';

const Login = () => {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Simple and direct redirection when user is authenticated
  useEffect(() => {
    console.log('🔄 Login: Checking auth state -', { 
      user: !!user, 
      loading,
      hasUserId: user?.id ? true : false
    });

    // If user is authenticated and not loading, redirect immediately
    if (user && !loading) {
      console.log('✅ Login: Usuario autenticado, redirigiendo ahora...');
      const from = location.state?.from?.pathname || '/';
      
      console.log('🔄 Login: Navegando a:', from);
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location.state]);

  // Don't render anything if user is authenticated (let navigation happen)
  if (user && !loading) {
    console.log('🔄 Login: Usuario autenticado, esperando navegación...');
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
