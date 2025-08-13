
import React, { useEffect, useState } from 'react';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { Navigate } from 'react-router-dom';

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
}

export const SimpleProtectedRoute: React.FC<SimpleProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useSimpleAuthContext();
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Set a timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('⚠️ SimpleProtectedRoute: Loading timeout reached');
        setHasTimedOut(true);
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  console.log('🛡️ SimpleProtectedRoute: Estado actual', { 
    user: !!user, 
    loading,
    hasTimedOut,
    email: user?.email 
  });

  // If loading has timed out and we still don't have a user, redirect to login
  if (hasTimedOut && !user) {
    console.log('⏰ SimpleProtectedRoute: Timeout reached, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (loading && !hasTimedOut) {
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
