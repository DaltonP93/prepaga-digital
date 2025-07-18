
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthContext } from '@/components/AuthProvider';
import { useBranding } from '@/hooks/useBranding';
import { toast } from 'sonner';
import { usePasswordReset } from '@/hooks/usePasswordReset';
import { LogIn } from 'lucide-react';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuthContext();
  const { requestPasswordReset } = usePasswordReset();
  
  // Obtener configuración de branding basada en el dominio o configuración por defecto
  const { branding } = useBranding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      toast.success('¡Bienvenido!');
    } catch (error: any) {
      console.error('Error en login:', error);
      // Mostrar mensaje específico de error
      if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
        toast.error('Credenciales incorrectas. Verifica tu email y contraseña.');
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error('Por favor confirma tu email antes de iniciar sesión.');
      } else {
        toast.error('Error al iniciar sesión: ' + (error.message || 'Intenta de nuevo'));
      }
    } finally {
      setLoading(false);
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
            {branding?.login_title || "Seguro Digital"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {branding?.login_subtitle || "Sistema de Firma Digital"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Tu contraseña"
              />
            </div>
            <div className="space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Iniciando sesión...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Iniciar Sesión
                  </span>
                )}
              </Button>
              
              <div className="text-center">
                <Button 
                  variant="link" 
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary"
                  onClick={() => {
                    const email = prompt('Ingresa tu correo electrónico');
                    if (email) {
                      requestPasswordReset(email);
                    }
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
