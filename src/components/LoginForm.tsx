
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthContext } from '@/components/AuthProvider';
import { useCompanyBranding } from '@/hooks/useCompanySettings';
import { toast } from 'sonner';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';
import { Link } from 'react-router-dom';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { signIn } = useAuthContext();
  
  // Obtener configuración de branding - con fallback si no hay datos
  const { data: branding } = useCompanyBranding();

  // Manejo de bloqueo por intentos fallidos
  useEffect(() => {
    const storedAttempts = localStorage.getItem('loginAttempts');
    const lastAttempt = localStorage.getItem('lastLoginAttempt');
    
    if (storedAttempts && lastAttempt) {
      const attempts = parseInt(storedAttempts);
      const lastAttemptTime = new Date(lastAttempt);
      const now = new Date();
      const timeDiff = (now.getTime() - lastAttemptTime.getTime()) / 1000 / 60; // minutos
      
      if (attempts >= 5 && timeDiff < 15) {
        setIsBlocked(true);
        setLoginAttempts(attempts);
        setBlockTimeLeft(Math.ceil(15 - timeDiff));
        
        const timer = setInterval(() => {
          setBlockTimeLeft(prev => {
            if (prev <= 1) {
              setIsBlocked(false);
              setLoginAttempts(0);
              localStorage.removeItem('loginAttempts');
              localStorage.removeItem('lastLoginAttempt');
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 60000);
        
        return () => clearInterval(timer);
      } else if (timeDiff >= 15) {
        // Reset después de 15 minutos
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('lastLoginAttempt');
        setLoginAttempts(0);
      } else {
        setLoginAttempts(attempts);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      toast.error(`Cuenta bloqueada. Intente nuevamente en ${blockTimeLeft} minutos.`);
      return;
    }
    
    setLoading(true);

    try {
      await signIn(email, password);
      toast.success('¡Bienvenido!');
      
      // Reset intentos exitosos
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('lastLoginAttempt');
      setLoginAttempts(0);
    } catch (error: any) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      localStorage.setItem('loginAttempts', newAttempts.toString());
      localStorage.setItem('lastLoginAttempt', new Date().toISOString());
      
      if (newAttempts >= 5) {
        setIsBlocked(true);
        setBlockTimeLeft(15);
        toast.error('Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.');
      } else {
        toast.error(`Error al iniciar sesión. Intentos restantes: ${5 - newAttempts}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Usar valores por defecto si no hay branding
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
            {branding?.login_title || "Seguro Digital"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {branding?.login_subtitle || "Sistema de Firma Digital"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isBlocked && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">
                Cuenta bloqueada por seguridad. Tiempo restante: {blockTimeLeft} minutos.
              </span>
            </div>
          )}
          
          {loginAttempts > 0 && loginAttempts < 5 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                Intentos fallidos: {loginAttempts}/5. Cuidado con el bloqueo automático.
              </span>
            </div>
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
                disabled={isBlocked}
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
                  disabled={isBlocked}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isBlocked}
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
                disabled={isBlocked}
              >
                ¿Olvidó su contraseña?
              </Button>
              
              <Link to="/register" className="text-sm text-primary hover:underline">
                Crear cuenta
              </Link>
            </div>
            
            <Button type="submit" className="w-full" disabled={loading || isBlocked}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
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
