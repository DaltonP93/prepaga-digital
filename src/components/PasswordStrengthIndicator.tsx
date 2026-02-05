
import { AlertCircle, CheckCircle2, XCircle, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  strengthScore: number;
  errors: string[];
  isBreached: boolean;
  isChecking: boolean;
}

export const PasswordStrengthIndicator = ({
  strengthScore,
  errors,
  isBreached,
  isChecking,
}: PasswordStrengthIndicatorProps) => {
  const getStrengthLabel = () => {
    if (isBreached) return 'Comprometida';
    if (strengthScore < 30) return 'Muy débil';
    if (strengthScore < 50) return 'Débil';
    if (strengthScore < 70) return 'Moderada';
    if (strengthScore < 90) return 'Fuerte';
    return 'Muy fuerte';
  };

  const getStrengthColor = () => {
    if (isBreached) return 'bg-destructive';
    if (strengthScore < 30) return 'bg-destructive';
    if (strengthScore < 50) return 'bg-orange-500';
    if (strengthScore < 70) return 'bg-yellow-500';
    if (strengthScore < 90) return 'bg-emerald-400';
    return 'bg-emerald-500';
  };

  const getIcon = () => {
    if (isChecking) {
      return <Shield className="h-4 w-4 animate-pulse text-muted-foreground" />;
    }
    if (isBreached) {
      return <ShieldAlert className="h-4 w-4 text-destructive" />;
    }
    if (strengthScore >= 60 && errors.length === 0) {
      return <ShieldCheck className="h-4 w-4 text-emerald-500" />;
    }
    return <Shield className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-2 mt-2">
      {/* Barra de fortaleza */}
      <div className="flex items-center gap-2">
        {getIcon()}
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', getStrengthColor())}
            style={{ width: `${isBreached ? 100 : strengthScore}%` }}
          />
        </div>
        <span className={cn(
          'text-xs font-medium',
          isBreached ? 'text-destructive' : 
          strengthScore >= 70 ? 'text-emerald-500' : 'text-muted-foreground'
        )}>
          {isChecking ? 'Verificando...' : getStrengthLabel()}
        </span>
      </div>

      {/* Errores y recomendaciones */}
      {errors.length > 0 && (
        <ul className="space-y-1">
          {errors.map((error, index) => (
            <li key={index} className="flex items-start gap-2 text-xs">
              {error.includes('filtración') || error.includes('Comprometida') ? (
                <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
              )}
              <span className={cn(
                error.includes('filtración') ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {error}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Éxito */}
      {errors.length === 0 && strengthScore >= 60 && !isBreached && !isChecking && (
        <div className="flex items-center gap-2 text-xs text-emerald-500">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Contraseña segura</span>
        </div>
      )}
    </div>
  );
};
