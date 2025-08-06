
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/AuthProvider';

const Index = () => {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();

  console.log('🏠 Index: Estado actual', { 
    user: !!user, 
    loading,
    email: user?.email
  });

  useEffect(() => {
    if (!loading) {
      if (user) {
        console.log('✅ Index: Usuario autenticado, navegando a dashboard');
        navigate('/dashboard', { replace: true });
      } else {
        console.log('❌ Index: No hay usuario, navegando a login');
        navigate('/login', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  // Mostrar loading mientras se verifica la autenticación
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Cargando aplicación...</p>
      </div>
    </div>
  );
};

export default Index;
