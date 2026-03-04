
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { toast } from 'sonner';
import { Eye, EyeOff, Monitor, Moon, Shield, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemePreference, getStoredThemePreference, setThemePreference } from '@/lib/theme';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeMediaUrl } from '@/lib/mediaUrl';

export const SimpleLoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingBootstrap, setIsCheckingBootstrap] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [canBootstrapSuperAdmin, setCanBootstrapSuperAdmin] = useState(false);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => getStoredThemePreference());

  // Read branding from localStorage (persisted by CompanyBrandingProvider)
  const brandingLogo = (() => {
    try { return localStorage.getItem('samap_branding_logo') || ''; } catch { return ''; }
  })();
  const brandingBackground = (() => {
    try { return localStorage.getItem('samap_branding_login_background') || ''; } catch { return ''; }
  })();
  const brandingName = (() => {
    try { return localStorage.getItem('samap_branding_name') || 'SAMAP Digital'; } catch { return 'SAMAP Digital'; }
  })();
  const brandingSubtitle = (() => {
    try { return localStorage.getItem('samap_branding_login_subtitle') || 'Sistema de Firma Digital - Inicia sesión en tu cuenta'; } catch { return 'Sistema de Firma Digital - Inicia sesión en tu cuenta'; }
  })();
  const loginBackgroundUrl = sanitizeMediaUrl(brandingBackground);
  const loginLogoUrl = sanitizeMediaUrl(brandingLogo);
  const backgroundStyle = loginBackgroundUrl
    ? { backgroundImage: `url(${loginBackgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;
  const { user, loading, signIn } = useSimpleAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  console.log('🔑 SimpleLoginForm: Estado actual', {
    user: !!user,
    loading,
    email: user?.email,
    pathname: location.pathname
  });

  // Redirect user after successful login
  useEffect(() => {
    if (user && !loading) {
      const from = location.state?.from?.pathname || '/dashboard';
      console.log('✅ SimpleLoginForm: Usuario autenticado, navegando a:', from);
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location.state]);

  useEffect(() => {
    const checkBootstrapStatus = async () => {
      setIsCheckingBootstrap(true);
      try {
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: { action: 'can_bootstrap_super_admin' },
        });

        if (error) {
          console.error('Error checking super admin bootstrap:', error);
          setCanBootstrapSuperAdmin(false);
          return;
        }

        setCanBootstrapSuperAdmin(Boolean(data?.canBootstrap));
      } catch (error) {
        console.error('Unexpected error checking bootstrap status:', error);
        setCanBootstrapSuperAdmin(false);
      } finally {
        setIsCheckingBootstrap(false);
      }
    };

    checkBootstrapStatus();
  }, []);

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

  const handleThemeChange = (value: ThemePreference) => {
    setThemePreferenceState(value);
    setThemePreference(value);
  };

  const handleBootstrapSuperAdmin = async () => {
    setIsBootstrapping(true);
    try {
      const bootstrapEmail = email.trim() || 'admin@admin.com';
      const bootstrapPassword = password.trim() || 'admin123';
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          action: 'bootstrap_super_admin',
          email: bootstrapEmail,
          password: bootstrapPassword,
          first_name: 'Super',
          last_name: 'Admin',
        },
      });

      if (error || !data?.success) {
        const detail = (data && (data.error || data.details)) || error?.message || 'No se pudo crear el super admin inicial';
        toast.error(detail);
        return;
      }

      setCanBootstrapSuperAdmin(false);
      toast.success(`Super admin creado. Usuario: ${bootstrapEmail} | Contraseña: ${bootstrapPassword}`);
    } catch (error: any) {
      toast.error(error.message || 'Error al crear super admin inicial');
    } finally {
      setIsBootstrapping(false);
    }
  };

  // Show loading during auth verification
  if (loading) {
    console.log('⏳ SimpleLoginForm: Verificando autenticación...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">
            Verificando autenticación...
          </p>
        </div>
      </div>
    );
  }

  // Show loading during redirection if user is present
  if (user) {
    console.log('🔄 SimpleLoginForm: Usuario presente, redirigiendo...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  console.log('📋 SimpleLoginForm: Mostrando formulario de login');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20" style={backgroundStyle}>
      <Card className="w-full max-w-md backdrop-blur-sm bg-background/95 border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-1 rounded-xl border border-border/70 bg-muted/60 p-1">
            <Button
              type="button"
              size="sm"
              variant={themePreference === 'light' ? 'secondary' : 'ghost'}
              onClick={() => handleThemeChange('light')}
              className="h-8 px-2"
            >
              <Sun className="h-4 w-4 mr-1" />
              Claro
            </Button>
            <Button
              type="button"
              size="sm"
              variant={themePreference === 'dark' ? 'secondary' : 'ghost'}
              onClick={() => handleThemeChange('dark')}
              className="h-8 px-2"
            >
              <Moon className="h-4 w-4 mr-1" />
              Oscuro
            </Button>
            <Button
              type="button"
              size="sm"
              variant={themePreference === 'system' ? 'secondary' : 'ghost'}
              onClick={() => handleThemeChange('system')}
              className="h-8 px-2"
            >
              <Monitor className="h-4 w-4 mr-1" />
              Sistema
            </Button>
          </div>
          <div className="flex justify-center">
            {loginLogoUrl ? (
              <img src={loginLogoUrl} alt={brandingName} className="h-16 max-w-[200px] object-contain" />
            ) : (
              <div className="p-3 rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {brandingName}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {brandingSubtitle}
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

            {!isCheckingBootstrap && canBootstrapSuperAdmin && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isBootstrapping || isLoggingIn}
                onClick={handleBootstrapSuperAdmin}
              >
                {isBootstrapping ? 'Creando super admin inicial...' : 'Crear Super Admin inicial (una sola vez)'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleLoginForm;
