
import { SimpleLayout } from "@/components/SimpleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";

const SimpleDashboard = () => {
  const { profile, user, loading } = useSimpleAuthContext();

  console.log('🏠 SimpleDashboard: Renderizando dashboard', { 
    hasUser: !!user,
    hasProfile: !!profile,
    loading,
    profileName: profile?.first_name,
    userEmail: user?.email
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

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
                <Card className="p-4 bg-green-50 border-green-200">
                  <h3 className="font-semibold text-green-800">Estado de Sesión</h3>
                  <p className="text-green-600">✅ Conectado</p>
                </Card>
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <h3 className="font-semibold text-blue-800">Usuario</h3>
                  <p className="text-sm text-blue-600">{user?.email}</p>
                  <p className="text-xs text-blue-500">ID: {user?.id?.slice(0, 8)}...</p>
                </Card>
                <Card className="p-4 bg-purple-50 border-purple-200">
                  <h3 className="font-semibold text-purple-800">Perfil</h3>
                  <p className="text-sm text-purple-600">{profile?.role || 'Sin rol'}</p>
                  <p className="text-xs text-purple-500">
                    {profile ? `Empresa: ${profile.company_id?.slice(0, 8) || 'Sin empresa'}...` : 'Cargando perfil...'}
                  </p>
                </Card>
              </div>
              
              {/* Debug info */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left">
                <h4 className="font-medium mb-2">🔧 Información de Debug</h4>
                <div className="text-xs space-y-1 text-gray-600">
                  <p>• Usuario autenticado: {user ? '✅' : '❌'}</p>
                  <p>• Perfil cargado: {profile ? '✅' : '❌'}</p>
                  <p>• Estado de carga: {loading ? 'Cargando...' : 'Completo'}</p>
                  <p>• Email: {user?.email || 'No disponible'}</p>
                  <p>• Nombre: {profile?.first_name || 'No disponible'}</p>
                  <p>• Rol: {profile?.role || 'No disponible'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleLayout>
  );
};

export default SimpleDashboard;
