
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '@/components/LoginForm';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

const Login = () => {
  const { user, loading } = useSimpleAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Si el usuario está autenticado, redirigir inmediatamente
    if (user && !loading) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location.state]);

  // Mostrar loading solo durante verificación inicial
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">
            Verificando autenticación...
          </p>
        </div>
      </div>
    );
  }

  // Si hay usuario autenticado, mostrar loading de redirección
  if (user) {
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
  return <LoginForm />;
};

export default Login;
