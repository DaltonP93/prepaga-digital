
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/LoginForm';
import { useAuthContext } from '@/components/AuthProvider';

const Login = () => {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  // Don't render login form if user is already authenticated
  if (user && !loading) {
    return null;
  }

  return <LoginForm />;
};

export default Login;
