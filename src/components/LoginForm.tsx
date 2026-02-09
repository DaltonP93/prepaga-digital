
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompanyBranding } from '@/hooks/useCompanySettings';
import { SecurityAlert } from '@/components/auth/SecurityAlert';
import { useLoginSecurity } from '@/hooks/useLoginSecurity';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';
import { Link } from 'react-router-dom';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { signIn } = useSimpleAuthContext();
  const {
    loginAttempts,
    isBlocked,
    blockTimeLeft,
    recordFailedAttempt,
    resetAttempts
  } = useLoginSecurity();

  const { data: branding } = useCompanyBranding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBlocked) {
      toast.error(`Cuenta bloqueada. Intente nuevamente en  ${blockTimeLeft} minutos.`);
      return;
    }

    setIsLoggingIn(true);

    try {
      console.log('🔑 LoginForm: Iniciando proceso de login...');

      await signIn(email, password);

      console.log('✅ LoginForm: Login exitoso');
      resetAttempts();
      toast.success('¡Bienvenido! Has iniciado sesión correctamente.');

    } catch (error: any) {
      console.error('❌ LoginForm: Error en login:', error);
      const errorMessage = error?.message || '';

      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
        toast.error('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.');
      } else {
        const result = recordFailedAttempt();
        toast.error(result.message || errorMessage || 'Error al iniciar sesión');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const backgroundStyle = branding?.login_background_url
    ? { backgroundImage: `url(${branding.login_background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20" style={backgroundStyle}>
      <Card className="w-full max-w-md backdrop-blur-sm bg-background/95 border-border/50">
        <CardHeader className="text-center space-y-4">
          {branding?.login_logo_url && (
            <div className="flex justify-center">
              <img
                src={branding.login_logo_url}
                alt="Logo"
                className="h-16 w-auto object-contain"
              />
            </div>
          )}
          <CardTitle className="text-2xl font-bold text-foreground">
            {branding?.login_title || "SAMAP Digital V1"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {branding?.login_subtitle || "Sistema de Firma Digital"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isBlocked && (
            <SecurityAlert
              type="blocked"
              message={`Cuenta bloqueada por seguridad. Tiempo restante: ${blockTimeLeft} minutos.`}
            />
          )}

          {loginAttempts > 0 && loginAttempts < 5 && (
            <SecurityAlert
              type="warning"
              message={`Intentos fallidos: ${loginAttempts}/5. Cuidado con el bloqueo automático.`}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isBlocked || isLoggingIn}
                autoComplete="username"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isBlocked || isLoggingIn}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isBlocked || isLoggingIn}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => setShowForgotPassword(true)}
                disabled={isBlocked || isLoggingIn}
              >
                ¿Olvidó su contraseña?
              </Button>

              <Link to="/register" className="text-sm text-primary hover:underline">
                Crear cuenta
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isLoggingIn || isBlocked}>
              {isLoggingIn ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ForgotPasswordDialog
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
      />
    </div>
  );
};
