
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePasswordSecurity } from '@/hooks/usePasswordSecurity';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const { checkPassword, isChecking, lastResult } = usePasswordSecurity();

  // Verificar contraseña con debounce
  useEffect(() => {
    if (password.length >= 6) {
      const timer = setTimeout(() => {
        checkPassword(password);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [password, checkPassword]);

  const signUp = async (email: string, password: string, userData: { first_name: string; last_name: string }) => {
    // Verificar seguridad de contraseña antes de registrar
    const securityResult = await checkPassword(password);
    
    if (securityResult.isBreached) {
      throw new Error('Esta contraseña ha sido expuesta en filtraciones de datos. Por favor, elige otra.');
    }
    
    if (!securityResult.isStrong) {
      throw new Error(securityResult.errors[0] || 'La contraseña no cumple con los requisitos de seguridad.');
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: userData.first_name,
          last_name: userData.last_name,
        }
      }
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('Este email ya está registrado. Intenta iniciar sesión.');
      } else if (error.message.includes('Password should be')) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.');
      } else if (error.message.includes('Invalid email')) {
        throw new Error('Por favor ingresa un email válido.');
      }
      throw error;
    }

    toast.success('¡Cuenta creada! Revisa tu email para confirmar tu cuenta.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signUp(email, password, { first_name: firstName, last_name: lastName });
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || 'Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && !isChecking && (!lastResult || (lastResult.isStrong && !lastResult.isBreached));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
          <CardDescription>Sistema de Firma Digital</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                  minLength={8}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {/* Indicador de fortaleza */}
              {password.length > 0 && (
                <PasswordStrengthIndicator
                  strengthScore={lastResult?.strengthScore ?? 0}
                  errors={lastResult?.errors ?? []}
                  isBreached={lastResult?.isBreached ?? false}
                  isChecking={isChecking}
                />
              )}
            </div>
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {loading ? 'Creando cuenta...' : isChecking ? 'Verificando contraseña...' : 'Crear Cuenta'}
            </Button>
            <div className="text-center text-sm">
              <span className="text-muted-foreground">¿Ya tienes cuenta? </span>
              <Link to="/login" className="text-primary hover:underline">
                Iniciar Sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
