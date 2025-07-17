
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { usePasswordReset } from "@/hooks/usePasswordReset";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);
  const { updatePassword, loading } = usePasswordReset();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Verificar que el token de recuperación sea válido
  useEffect(() => {
    const checkSession = async () => {
      try {
        // La función getSession detectará automáticamente el token en la URL
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) {
          setError("El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.");
        }
      } catch (error: any) {
        setError("Ocurrió un error al validar tu solicitud de recuperación.");
      } finally {
        setValidatingToken(false);
      }
    };

    checkSession();
  }, []);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    try {
      const { success } = await updatePassword(values.password);
      
      if (success) {
        setResetSuccess(true);
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (error: any) {
      setError(error.message || "No se pudo actualizar la contraseña");
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verificando enlace</CardTitle>
            <CardDescription>Estamos validando tu solicitud...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>No se pudo restablecer la contraseña</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/login")} className="w-full">
              Volver a inicio de sesión
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-500">¡Éxito!</CardTitle>
            <CardDescription>Tu contraseña ha sido actualizada</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Contraseña actualizada</AlertTitle>
              <AlertDescription>
                La contraseña se ha cambiado correctamente. Serás redirigido a la página de inicio de sesión en unos segundos.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Restablecer contraseña</CardTitle>
          <CardDescription>Crea una nueva contraseña para tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormDescription>
                      Tu contraseña debe tener al menos 8 caracteres
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Actualizando..." : "Actualizar contraseña"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
