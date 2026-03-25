
-- Crear el tipo enum user_role si no existe
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'gestor', 'vendedor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Verificar que la tabla profiles tenga la columna role con el tipo correcto
DO $$ 
BEGIN
    -- Si la columna role existe pero no es del tipo correcto, la convertimos
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'role' 
        AND table_schema = 'public'
        AND data_type != 'USER-DEFINED'
    ) THEN
        -- Primero eliminamos el valor por defecto si existe
        ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
        
        -- Convertimos la columna al tipo enum
        ALTER TABLE public.profiles ALTER COLUMN role TYPE user_role USING role::user_role;
        
        -- Restauramos el valor por defecto
        ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'vendedor'::user_role;
    END IF;
    
    -- Si la columna no existe, la creamos
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'role' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role user_role NOT NULL DEFAULT 'vendedor'::user_role;
    END IF;
END $$;

-- Asegurar que el trigger handle_new_user use el tipo correcto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
        COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'vendedor'::user_role)
    );
    RETURN NEW;
END;
$$;
