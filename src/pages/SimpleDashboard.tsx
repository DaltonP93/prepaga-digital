
import { SimpleLayout } from "@/components/SimpleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/components/AuthProvider";

const SimpleDashboard = () => {
  const { profile, user } = useAuthContext();

  console.log('🏠 SimpleDashboard: Renderizando dashboard simple', { 
    hasUser: !!user,
    hasProfile: !!profile,
    profileName: profile?.first_name 
  });

  return (
    <SimpleLayout 
      title={`¡Bienvenido, ${profile?.first_name || user?.email || 'Usuario'}!`} 
      description="Dashboard Principal"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sistema de Firma Digital</CardTitle>
            <CardDescription>Panel de control principal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold mb-4">
                ¡Bienvenido al sistema, {profile?.first_name || user?.email}!
              </h2>
              <p className="text-muted-foreground mb-6">
                Has iniciado sesión correctamente. El sistema está funcionando.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <Card className="p-4">
                  <h3 className="font-semibold">Estado de Sesión</h3>
                  <p className="text-green-600">✅ Conectado</p>
                </Card>
                <Card className="p-4">
                  <h3 className="font-semibold">Usuario</h3>
                  <p className="text-sm">{user?.email}</p>
                </Card>
                <Card className="p-4">
                  <h3 className="font-semibold">Rol</h3>
                  <p className="text-sm">{profile?.role || 'Cargando...'}</p>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleLayout>
  );
};

export default SimpleDashboard;
