
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';

export const ProfileLogoutButton = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signOut } = useSimpleAuthContext();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      console.log('🚪 ProfileLogoutButton: Iniciando logout...');
      await signOut();
      console.log('✅ ProfileLogoutButton: Logout completado');
    } catch (error) {
      console.error('❌ ProfileLogoutButton: Error al cerrar sesión:', error);
      // Forzar limpieza y redirección incluso si hay error
      const brandingKeys = [
        'samap_branding_favicon',
        'samap_branding_logo',
        'samap_branding_name',
        'samap_branding_login_background',
        'samap_branding_login_subtitle',
      ] as const;
      const preserved = brandingKeys.map((key) => [key, localStorage.getItem(key)] as const);
      localStorage.clear();
      preserved.forEach(([key, value]) => {
        if (value) localStorage.setItem(key, value);
      });
      sessionStorage.clear();
      window.location.href = '/login';
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
