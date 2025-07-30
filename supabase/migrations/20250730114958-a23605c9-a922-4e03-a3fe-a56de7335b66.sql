
-- Crear tabla de permisos modulares
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_key)
);

-- Crear tabla de permisos disponibles
CREATE TABLE public.available_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permission_key TEXT NOT NULL UNIQUE,
  permission_name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar permisos disponibles
INSERT INTO public.available_permissions (permission_key, permission_name, description, category) VALUES
('dashboard.view', 'Ver Dashboard', 'Acceso al dashboard principal', 'dashboard'),
('sales.view', 'Ver Ventas', 'Acceso a la lista de ventas', 'sales'),
('sales.create', 'Crear Ventas', 'Crear nuevas ventas', 'sales'),
('sales.edit', 'Editar Ventas', 'Modificar ventas existentes', 'sales'),
('sales.delete', 'Eliminar Ventas', 'Eliminar ventas', 'sales'),
('clients.view', 'Ver Clientes', 'Acceso a la lista de clientes', 'clients'),
('clients.create', 'Crear Clientes', 'Crear nuevos clientes', 'clients'),
('clients.edit', 'Editar Clientes', 'Modificar clientes existentes', 'clients'),
('plans.view', 'Ver Planes', 'Acceso a la lista de planes', 'plans'),
('plans.create', 'Crear Planes', 'Crear nuevos planes', 'plans'),
('plans.edit', 'Editar Planes', 'Modificar planes existentes', 'plans'),
('documents.view', 'Ver Documentos', 'Acceso a documentos', 'documents'),
('templates.view', 'Ver Templates', 'Acceso a templates', 'templates'),
('templates.create', 'Crear Templates', 'Crear nuevos templates', 'templates'),
('templates.edit', 'Editar Templates', 'Modificar templates existentes', 'templates'),
('analytics.view', 'Ver Analytics', 'Acceso a analytics', 'analytics'),
('users.view', 'Ver Usuarios', 'Acceso a la gestión de usuarios', 'admin'),
('users.create', 'Crear Usuarios', 'Crear nuevos usuarios', 'admin'),
('users.edit', 'Editar Usuarios', 'Modificar usuarios existentes', 'admin'),
('companies.view', 'Ver Empresas', 'Acceso a la gestión de empresas', 'admin'),
('companies.create', 'Crear Empresas', 'Crear nuevas empresas', 'admin'),
('companies.edit', 'Editar Empresas', 'Modificar empresas existentes', 'admin'),
('audit.view', 'Ver Auditoría', 'Acceso a logs de auditoría', 'admin'),
('experience.view', 'Ver Configuración', 'Acceso a configuración del sistema', 'admin');

-- Habilitar RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas para user_permissions
CREATE POLICY "Super admins can manage all user permissions"
ON public.user_permissions
FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (user_id = auth.uid());

-- Políticas para available_permissions
CREATE POLICY "All authenticated users can view available permissions"
ON public.available_permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super admins can manage available permissions"
ON public.available_permissions
FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin');

-- Función para verificar permisos
CREATE OR REPLACE FUNCTION public.user_has_permission(user_id UUID, permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE 
    WHEN get_user_role(user_id) = 'super_admin' THEN true
    ELSE COALESCE(
      (SELECT granted FROM public.user_permissions 
       WHERE user_permissions.user_id = user_has_permission.user_id 
       AND user_permissions.permission_key = user_has_permission.permission_key),
      false
    )
  END;
$$;

-- Función para obtener permisos de usuario
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE(permission_key TEXT, granted BOOLEAN)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    ap.permission_key,
    CASE 
      WHEN get_user_role(user_id) = 'super_admin' THEN true
      ELSE COALESCE(up.granted, false)
    END as granted
  FROM public.available_permissions ap
  LEFT JOIN public.user_permissions up ON ap.permission_key = up.permission_key AND up.user_id = get_user_permissions.user_id
  WHERE ap.is_active = true;
$$;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_permissions_updated_at
    BEFORE UPDATE ON public.user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
