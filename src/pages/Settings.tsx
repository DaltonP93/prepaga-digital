import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  GitBranch,
  History,
  Lock,
  CheckCircle2,
  Plug,
} from 'lucide-react';
import { TestDataManager } from '@/components/TestDataManager';
import { SessionConfigurationPanel } from '@/components/SessionConfigurationPanel';
import { SystemOptimizationPanel } from '@/components/SystemOptimizationPanel';
import { CacheMonitor } from '@/components/CacheMonitor';
import { CurrencyConfigurationPanel } from '@/components/CurrencyConfigurationPanel';
import { ProfileCompanyAssignmentPanel } from '@/components/ProfileCompanyAssignmentPanel';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { WorkflowConfigPanel } from '@/components/workflow/WorkflowConfigPanel';
import { SaleProgressConfigPanel } from '@/components/workflow/SaleProgressConfigPanel';
import { AdminConfigPanel } from '@/components/AdminConfigPanel';
import { MenuConfigPanel } from '@/components/MenuConfigPanel';
import { OtpPolicyConfigPanel } from '@/components/OtpPolicyConfigPanel';
import { useRolePermissions } from '@/hooks/useRolePermissions';

export default function Settings() {
  const { profile } = useSimpleAuthContext();
  const { role, roleLabel, isSuperAdmin, isAdmin, isLoadingRole } = useRolePermissions();
  const canManageWorkflow = isSuperAdmin || isAdmin;

  const recentChanges = [
    {
      date: '10/02/2026',
      title: 'Workflow de ventas configurable',
      detail: 'Se agregó configuración de transiciones por estado, roles que pueden ver/editar y requisitos para avanzar.',
      status: 'aplicado',
    },
    {
      date: '10/02/2026',
      title: 'Control de acceso por estado en Ventas',
      detail: 'La lista de ventas ahora respeta permisos por estado y bloquea edición cuando corresponde.',
      status: 'aplicado',
    },
    {
      date: '10/02/2026',
      title: 'Bloqueo de detalle por estado/rol',
      detail: 'Si el rol no tiene visibilidad del estado, no se muestra el detalle de la venta.',
      status: 'aplicado',
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-primary/10 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-7 w-7" />
              <h1 className="text-3xl font-bold">Configuración</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Centro único de administración del sistema: cuenta, operación, branding, workflow y mantenimiento.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary">
                Rol actual: {isLoadingRole ? 'resolviendo...' : roleLabel || role || 'sin rol'}
              </Badge>
              <Badge variant={profile?.company_id ? 'default' : 'destructive'}>
                {profile?.company_id ? 'Empresa asignada' : 'Sin company_id'}
              </Badge>
            </div>
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

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto gap-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="operacion">Operación</TabsTrigger>
          <TabsTrigger value="integraciones" className="flex items-center gap-1">
            <Plug className="h-3.5 w-3.5" />
            Integraciones
          </TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
          <TabsTrigger value="cambios">Últimos cambios</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Perfil</CardTitle>
                <CardDescription>Datos personales y cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/profile">Editar perfil</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Seguridad</CardTitle>
                <CardDescription>Roles y accesos</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/users">Administrar usuarios</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notificaciones</CardTitle>
                <CardDescription>Preferencias de alertas</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" disabled>Próximamente</Button>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Configuración de sesión</CardTitle>
              <CardDescription>Inactividad y cierre automático</CardDescription>
            </CardHeader>
            <CardContent>
              <SessionConfigurationPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Asignación de empresa</CardTitle>
              <CardDescription>Define `company_id` por perfil para cumplir RLS</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileCompanyAssignmentPanel />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Moneda</CardTitle>
              <CardDescription>Formato comercial por empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <CurrencyConfigurationPanel />
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> UX / Branding</CardTitle>
                <CardDescription>Diseño visual y experiencia</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/experience">Abrir panel UX/Branding</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Accesos y roles</CardTitle>
                <CardDescription>Gestión de permisos</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/users">Gestionar accesos</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
          {canManageWorkflow && <MenuConfigPanel />}
        </TabsContent>

        <TabsContent value="integraciones" className="space-y-4">
          {canManageWorkflow ? (
            <>
              <AdminConfigPanel />
              <OtpPolicyConfigPanel />
            </>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <Lock className="h-4 w-4" />
                    Sin permisos para configurar integraciones
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Solo roles admin y super_admin pueden configurar APIs externas.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" /> Workflow de ventas</CardTitle>
                <Badge variant={canManageWorkflow ? 'default' : 'outline'}>
                  {canManageWorkflow ? 'Editable' : 'Solo lectura'}
                </Badge>
              </div>
              <CardDescription>
                Define qué perfiles pueden ver/editar cada estado y qué condiciones se requieren para avanzar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canManageWorkflow && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <Lock className="h-4 w-4" />
                    Sin permisos para editar workflow
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Este bloque es editable solo para roles `admin` y `super_admin`.
                  </p>
                </div>
              )}
              {!profile?.company_id && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  No hay `company_id` asignado al perfil. Asigna empresa para habilitar configuración por compañía.
                </div>
              )}
              {canManageWorkflow && profile?.company_id && (
                <WorkflowConfigPanel companyId={profile.company_id} />
              )}
            </CardContent>
          </Card>
          {canManageWorkflow && profile?.company_id && (
            <SaleProgressConfigPanel />
          )}
        </TabsContent>

        <TabsContent value="sistema" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isSuperAdmin && <TestDataManager />}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" /> Monitor de cache</CardTitle>
                <CardDescription>Salud de almacenamiento local</CardDescription>
              </CardHeader>
              <CardContent>
                <CacheMonitor />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5" /> Limpieza y optimización</CardTitle>
                <CardDescription>Mantenimiento general</CardDescription>
              </CardHeader>
              <CardContent>
                <SystemOptimizationPanel />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cambios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Últimos cambios aplicados</CardTitle>
              <CardDescription>Resumen técnico visible desde el panel de configuración</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentChanges.map((change, idx) => (
                <div key={`${change.title}-${idx}`} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{change.title}</p>
                    <Badge variant="secondary">{change.date}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{change.detail}</p>
                  <div className="flex items-center gap-1 text-xs text-emerald-500 mt-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {change.status}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
