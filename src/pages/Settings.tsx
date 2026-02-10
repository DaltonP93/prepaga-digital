import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Clock,
  Trash2,
  Gauge,
  Palette,
  Building2,
  CreditCard,
  Wrench,
  Sparkles,
  Users,
} from 'lucide-react';
import { TestDataManager } from '@/components/TestDataManager';
import { SessionConfigurationPanel } from '@/components/SessionConfigurationPanel';
import { SystemOptimizationPanel } from '@/components/SystemOptimizationPanel';
import { CacheMonitor } from '@/components/CacheMonitor';
import { CurrencyConfigurationPanel } from '@/components/CurrencyConfigurationPanel';
import { ProfileCompanyAssignmentPanel } from '@/components/ProfileCompanyAssignmentPanel';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

const CategoryTitle = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
    </div>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default function Settings() {
  const { userRole } = useSimpleAuthContext();
  const isSuperAdmin = userRole === 'super_admin';

  return (
    <div className="container mx-auto py-6 space-y-8">
      <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-primary/10 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-7 w-7" />
              <h1 className="text-3xl font-bold">Configuración</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Centro único de administración del sistema: cuenta, comercial, branding, rendimiento y reglas operativas.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/profile">Mi perfil</Link>
            </Button>
            <Button asChild>
              <Link to="/experience">UX / Branding</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <CategoryTitle
          icon={Sparkles}
          title="Cuenta y Seguridad"
          description="Preferencias personales, autenticación y controles de acceso."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Perfil
              </CardTitle>
              <CardDescription>Actualiza tus datos personales</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/profile">Editar perfil</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Seguridad
              </CardTitle>
              <CardDescription>Contraseña y controles de acceso</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/users">Administrar usuarios</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaciones
              </CardTitle>
              <CardDescription>Preferencias de alertas del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                Próximamente
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Configuración de Sesión
              </CardTitle>
              <CardDescription>Tiempo de inactividad y cierre automático</CardDescription>
            </CardHeader>
            <CardContent>
              <SessionConfigurationPanel />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <CategoryTitle
          icon={CreditCard}
          title="Comercial y Operación"
          description="Reglas comerciales, moneda y asignaciones para trabajo multiempresa."
        />
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Asignación de Empresa por Usuario
              </CardTitle>
              <CardDescription>Define el company_id del perfil para cumplimiento con RLS</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileCompanyAssignmentPanel />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Configuración de Moneda
              </CardTitle>
              <CardDescription>Formato de precios y símbolo monetario por empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <CurrencyConfigurationPanel />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <CategoryTitle
          icon={Palette}
          title="UX, Branding y Móvil"
          description="Experiencia visual, identidad de marca y capacidades para app móvil."
        />
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Branding y Experiencia
              </CardTitle>
              <CardDescription>Colores, logos, login y visual del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/experience">Abrir panel UX/Branding</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Accesos y Roles
              </CardTitle>
              <CardDescription>Control de permisos por usuario y equipos</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/users">Gestionar accesos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <CategoryTitle
          icon={Wrench}
          title="Sistema y Mantenimiento"
          description="Salud técnica, optimización y herramientas operativas internas."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isSuperAdmin && <TestDataManager />}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Monitor de Cache
              </CardTitle>
              <CardDescription>Estado del cache y almacenamiento local</CardDescription>
            </CardHeader>
            <CardContent>
              <CacheMonitor />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Limpieza del Sistema
              </CardTitle>
              <CardDescription>Herramientas de mantenimiento y optimización</CardDescription>
            </CardHeader>
            <CardContent>
              <SystemOptimizationPanel />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
