
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SimpleLoginForm } from '@/components/SimpleLoginForm';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

const SimpleLogin = () => {
  const { user, loading } = useSimpleAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  console.log('🔑 SimpleLogin: Estado actual', { 
    user: !!user, 
    loading,
    email: user?.email,
    pathname: location.pathname
  });

  useEffect(() => {
    // Si el usuario está autenticado, redirigir inmediatamente
    if (user && !loading) {
      const from = location.state?.from?.pathname || '/';
      console.log('✅ SimpleLogin: Usuario autenticado, navegando a:', from);
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location.state]);

  // Mostrar loading mientras se verifica la autenticación inicial
  if (loading) {
    console.log('⏳ SimpleLogin: Mostrando loading...');
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
    console.log('🔄 SimpleLogin: Usuario presente, navegación en progreso...');
    return null;
  }

  // Mostrar formulario de login solo si no hay usuario
  console.log('📋 SimpleLogin: Mostrando formulario de login');
  return <SimpleLoginForm />;
};

export default SimpleLogin;
