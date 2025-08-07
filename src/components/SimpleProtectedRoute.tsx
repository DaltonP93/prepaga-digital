
import React from 'react';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { Navigate } from 'react-router-dom';

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
}

export const SimpleProtectedRoute: React.FC<SimpleProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useSimpleAuthContext();

  console.log('🛡️ SimpleProtectedRoute: Estado actual', { 
    user: !!user, 
    loading,
    email: user?.email 
  });

  if (loading) {
    console.log('⏳ SimpleProtectedRoute: Mostrando loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('❌ SimpleProtectedRoute: Usuario no autenticado, redirigiendo a login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ SimpleProtectedRoute: Usuario autenticado, mostrando contenido protegido');
  return <>{children}</>;
};
