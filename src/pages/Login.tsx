
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '@/components/LoginForm';
import { useAuthContext } from '@/components/AuthProvider';

const Login = () => {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [redirectHandled, setRedirectHandled] = useState(false);

  // Handle redirection when user becomes authenticated
  useEffect(() => {
    console.log('🔄 Login: Estado actual -', { 
      user: !!user, 
      loading, 
      redirectHandled,
      hasUserId: user?.id ? true : false
    });

    if (user && !loading && !redirectHandled) {
      console.log('✅ Login: Usuario autenticado, redirigiendo...');
      const from = location.state?.from?.pathname || '/';
      
      setRedirectHandled(true);
      
      // Usar setTimeout para asegurar que el cambio de estado se complete
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 100);
    }
  }, [user, loading, navigate, location.state, redirectHandled]);

  // Reset redirect flag when user changes
  useEffect(() => {
    if (!user) {
      setRedirectHandled(false);
    }
  }, [user]);

  // Show loading state briefly during redirection
  if (user && !loading && redirectHandled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Don't render login form if user is already authenticated
  if (user && !loading) {
    return null;
  }

  return <LoginForm />;
};

export default Login;
