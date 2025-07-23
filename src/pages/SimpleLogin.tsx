
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SimpleLoginForm } from '@/components/SimpleLoginForm';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

const SimpleLogin = () => {
  const { user, loading } = useSimpleAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🔄 SimpleLogin: Verificando estado de auth', { 
      user: !!user, 
      loading,
      email: user?.email
    });

    // Si el usuario está autenticado, redirigir inmediatamente
    if (user && !loading) {
      const from = location.state?.from?.pathname || '/';
      console.log('✅ SimpleLogin: Usuario autenticado, navegando a:', from);
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location.state]);

  // Mostrar loading mientras se verifica
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

  // No mostrar nada si el usuario está autenticado (navegación en progreso)
  if (user) {
    return null;
  }

  // Mostrar formulario de login solo si no hay usuario
  return <SimpleLoginForm />;
};

export default SimpleLogin;
