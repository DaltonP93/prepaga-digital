
import React, { useEffect, useState, useMemo } from 'react';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { Navigate, useLocation } from 'react-router-dom';

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
}

export const SimpleProtectedRoute: React.FC<SimpleProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useSimpleAuthContext();
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const location = useLocation();

  // Timeout solo para el loading inicial - 5 segundos es suficiente
  useEffect(() => {
    if (!loading) {
      setHasTimedOut(false);
      return;
    }
    
    const timeout = setTimeout(() => {
      if (loading) {
        setHasTimedOut(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loading]);

  // Memoizar la decisión de renderizado para evitar re-renders
  const renderContent = useMemo(() => {
    // Si tenemos usuario, mostrar contenido inmediatamente
    if (user) {
      return 'authenticated';
    }
    
    // Si loading terminó y no hay usuario, redirigir
    if (!loading && !user) {
      return 'redirect';
    }
    
    // Si timeout y no hay usuario, redirigir
    if (hasTimedOut && !user) {
      return 'redirect';
    }
    
    // Mostrar loading solo durante la verificación inicial
    return 'loading';
  }, [user, loading, hasTimedOut]);

  if (renderContent === 'redirect') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (renderContent === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
