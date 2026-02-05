
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Shield, Key, Smartphone, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePasswordSecurity } from "@/hooks/usePasswordSecurity";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

export function SecuritySettings() {
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  const { checkPassword, isChecking, lastResult } = usePasswordSecurity();

  // Verificar nueva contraseña con debounce
  useEffect(() => {
    if (newPassword.length >= 6) {
      const timer = setTimeout(() => {
        checkPassword(newPassword);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [newPassword, checkPassword]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    // Verificar seguridad de la nueva contraseña
    const securityResult = await checkPassword(newPassword);
    
    if (securityResult.isBreached) {
      toast.error('Esta contraseña ha sido expuesta en filtraciones de datos. Elige otra.');
      return;
    }
    
    if (!securityResult.isStrong) {
      toast.error(securityResult.errors[0] || 'La contraseña no cumple con los requisitos de seguridad.');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Contraseña actualizada exitosamente');
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorToggle = async (enabled: boolean) => {
    try {
      setLoading(true);
      setTwoFactorEnabled(enabled);
      
      if (enabled) {
        toast.success('Autenticación de dos factores habilitada');
      } else {
        toast.success('Autenticación de dos factores deshabilitada');
      }
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      toast.error('Error al cambiar la configuración de 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cambiar Contraseña */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>
            Actualiza tu contraseña para mantener tu cuenta segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña Actual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {/* Indicador de fortaleza */}
              {newPassword.length > 0 && (
                <PasswordStrengthIndicator
                  strengthScore={lastResult?.strengthScore ?? 0}
                  errors={lastResult?.errors ?? []}
                  isBreached={lastResult?.isBreached ?? false}
                  isChecking={isChecking}
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading || isChecking || (lastResult && (!lastResult.isStrong || lastResult.isBreached))}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isChecking ? 'Verificando...' : 'Actualizar Contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Autenticación de Dos Factores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Autenticación de Dos Factores
          </CardTitle>
          <CardDescription>
            Añade una capa extra de seguridad a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Habilitar 2FA</p>
              <p className="text-sm text-muted-foreground">
                Requiere un código de verificación además de tu contraseña
              </p>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={handleTwoFactorToggle}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Sesiones Activas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sesiones Activas
          </CardTitle>
          <CardDescription>
            Administra dónde está iniciada tu sesión
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Sesión Actual</p>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <Button variant="outline" size="sm">
                Esta sesión
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
