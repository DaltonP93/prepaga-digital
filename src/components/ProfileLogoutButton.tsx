
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import { useNavigate } from 'react-router-dom';

export const ProfileLogoutButton = () => {
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
      console.error('❌ ProfileLogoutButton: Error al cerrar sesión:', error);
      navigate('/login', { replace: true });
    } finally {
      setIsLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setShowConfirm(true)}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Cerrando...
          </>
        ) : (
          <>
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </>
        )}
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
