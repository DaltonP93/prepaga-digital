
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '@/components/LoginForm';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { User } from '@supabase/supabase-js';

const Login = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        
        if (session?.user) {
          const from = location.state?.from?.pathname || '/';
          console.log('✅ Login: Usuario autenticado, navegando a:', from);
          navigate(from, { replace: true });
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        setUser(session?.user || null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          const from = location.state?.from?.pathname || '/';
          console.log('✅ Login: Usuario autenticado, navegando a:', from);
          navigate(from, { replace: true });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, location.state]);

  // Show loading while checking auth
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

  // Don't show anything if user is authenticated (navigation in progress)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Show login form only if user is not authenticated
  return <LoginForm />;
};

export default Login;
