
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';

export const LogoutButton = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signOut } = useSimpleAuthContext();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      console.log('🚪 LogoutButton: Iniciando logout...');
      await signOut();
      console.log('✅ LogoutButton: Logout completado');
    } catch (error) {
      console.error('❌ LogoutButton: Error al cerrar sesión:', error);
      // Forzar limpieza y redirección incluso si hay error
      const brandingKeys = [
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
