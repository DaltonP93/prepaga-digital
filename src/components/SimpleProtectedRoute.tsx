
import React from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { Navigate } from 'react-router-dom';

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
}

export const SimpleProtectedRoute: React.FC<SimpleProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
