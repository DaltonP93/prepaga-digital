
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export const LoginForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: companySettings } = useCompanySettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido al sistema",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error de inicio de sesión",
        description: error.message || "Credenciales incorrectas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Estilos de fondo condicionales basados en la configuración de la empresa
  const backgroundStyle = companySettings?.login_background_url
    ? {
        backgroundImage: `url(${companySettings.login_background_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={backgroundStyle}
    >
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          {companySettings?.login_logo_url && (
            <div className="mx-auto mb-2">
              <img
                src={companySettings.login_logo_url}
                alt="Logo"
                className="h-16 mx-auto"
              />
            </div>
          )}
          <CardTitle className="text-2xl">
            {companySettings?.login_title || "Seguro Digital"}
          </CardTitle>
          <CardDescription>
            {companySettings?.login_subtitle || "Sistema de Firma Digital"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@ejemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <ForgotPasswordDialog />
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          <p>Sistema seguro de gestión de ventas y firmas digitales</p>
        </CardFooter>
      </Card>
    </div>
  );
};
