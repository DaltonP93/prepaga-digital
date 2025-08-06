
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '@/components/LoginForm';
import { useAuthContext } from '@/components/AuthProvider';

const Login = () => {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  console.log('🔑 Login: Estado actual', { 
    user: !!user, 
    loading,
    email: user?.email,
    pathname: location.pathname
  });

  useEffect(() => {
    // Si el usuario está autenticado, redirigir inmediatamente
    if (user && !loading) {
      const from = location.state?.from?.pathname || '/dashboard';
      console.log('✅ Login: Usuario autenticado, navegando a:', from);
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location.state]);

  // Mostrar loading solo durante verificación inicial
  if (loading) {
    console.log('⏳ Login: Mostrando loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si hay usuario, no mostrar nada (navegación en progreso)
  if (user) {
    console.log('🔄 Login: Usuario presente, navegación en progreso...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Mostrar formulario de login solo si no hay usuario
  console.log('📋 Login: Mostrando formulario de login');
  return <LoginForm />;
};

export default Login;
