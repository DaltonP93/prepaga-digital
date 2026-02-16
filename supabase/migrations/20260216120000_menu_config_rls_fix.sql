-- Migración: Agregar columna menu_config y política RLS para lectura por todos los usuarios
-- Contexto: El panel de configuración de menú permite a admins definir qué menús ve cada rol.
-- Sin esta migración, los usuarios no-admin no pueden leer la configuración (RLS los bloquea).

-- 1. Agregar columna menu_config si no existe
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS menu_config JSONB DEFAULT NULL;

-- 2. Comentario descriptivo
COMMENT ON COLUMN public.company_settings.menu_config IS 'Configuración de visibilidad de menú por rol. Estructura: { "routeKey": { "role": boolean } }';

-- 3. Política RLS: todos los usuarios autenticados pueden leer la configuración de su empresa
-- Usa el mismo patrón de subquery a profiles que las demás políticas del proyecto
CREATE POLICY "All authenticated users can read own company settings"
ON public.company_settings
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);
