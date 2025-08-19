import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthContext } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SimpleLoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { signIn } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    
    setIsLoggingIn(true);

    try {
      console.log('🔑 SimpleLoginForm: Iniciando proceso de login...');
      await signIn(email, password);
      console.log('✅ SimpleLoginForm: Login exitoso');
      
      toast.success('¡Bienvenido! Has iniciado sesión correctamente.');
      
    } catch (error: any) {
      console.error('❌ SimpleLoginForm: Error en login:', error);
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
      <Card className="w-full max-w-md backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Seguro Digital
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sistema de Firma Digital - Inicia sesión en tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                disabled={isLoggingIn}
                autoComplete="username"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  required
                  disabled={isLoggingIn}
                  autoComplete="current-password"
                  className="w-full pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoggingIn}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <Link 
                to="/register" 
                className="text-primary hover:underline"
                tabIndex={isLoggingIn ? -1 : 0}
              >
                ¿No tienes cuenta?
              </Link>
              <Link 
                to="/reset-password" 
                className="text-muted-foreground hover:text-foreground hover:underline"
                tabIndex={isLoggingIn ? -1 : 0}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoggingIn}
              size="lg"
            >
              {isLoggingIn ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleLoginForm;
