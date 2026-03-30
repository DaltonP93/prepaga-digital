
-- Corregir el rol del usuario dalton.perez@saa.com.py a super_admin
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'dalton.perez@saa.com.py';

-- Mejorar la función handle_new_user para manejar mejor los metadatos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear función para crear usuarios con roles administrativos (Edge Function helper)
CREATE OR REPLACE FUNCTION public.create_user_profile(
    user_id UUID,
    user_email TEXT,
    first_name TEXT,
    last_name TEXT,
    user_role user_role DEFAULT 'vendedor',
    company_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    profile_id UUID;
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        first_name, 
        last_name, 
        role, 
        company_id
    ) VALUES (
        user_id,
        user_email,
        first_name,
        last_name,
        user_role,
        company_id
    ) RETURNING id INTO profile_id;
    
    RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
