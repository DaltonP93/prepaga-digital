
import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, LogOut, RefreshCcw } from 'lucide-react';

interface SessionTimeoutDialogProps {
  open: boolean;
  timeLeft: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutDialog = ({ 
  open, 
  timeLeft: initialTimeLeft, 
  onExtend, 
  onLogout 
}: SessionTimeoutDialogProps) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);

  useEffect(() => {
    setTimeLeft(initialTimeLeft);
  }, [initialTimeLeft]);

  useEffect(() => {
    if (!open || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 60000); // Actualizar cada minuto

    return () => clearInterval(timer);
  }, [open, timeLeft, onLogout]);

  if (!open) return null;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="border-amber-200">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            Sesión por Expirar
          </AlertDialogTitle>
          <AlertDialogDescription>
            Su sesión expirará en <strong>{timeLeft} minuto{timeLeft !== 1 ? 's' : ''}</strong> por inactividad.
            <br />
            <span className="text-sm text-muted-foreground mt-2 block">
              ¿Desea extender su sesión o cerrar sesión ahora?
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onLogout} className="border-red-200 text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </AlertDialogCancel>
          <AlertDialogAction onClick={onExtend} className="bg-green-600 hover:bg-green-700">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Extender Sesión
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
