
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import { useNavigate } from 'react-router-dom';

export const LogoutButton = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signOut } = useSimpleAuthContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('❌ LogoutButton: Error al cerrar sesión:', error);
      navigate('/login', { replace: true });
    } finally {
      setIsLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        disabled={isLoading}
      >
        <LogOut className="h-4 w-4 mr-2" />
        {isLoading ? 'Cerrando...' : 'Cerrar Sesión'}
      </Button>

      <LogoutConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleLogout}
        isLoading={isLoading}
      />
    </>
  );
};
