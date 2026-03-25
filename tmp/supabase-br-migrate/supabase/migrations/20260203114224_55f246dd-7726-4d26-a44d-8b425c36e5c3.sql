-- Actualizar el perfil con nombre y empresa
UPDATE public.profiles 
SET first_name = 'Dalton',
    last_name = 'Admin',
    company_id = '0a1dc0e5-7378-4d14-b7bc-646b3e652bc6'
WHERE id = 'a91bd9e9-3965-4836-9a19-575baec01dcf';

-- Cambiar el rol a super_admin
UPDATE public.user_roles 
SET role = 'super_admin'
WHERE user_id = 'a91bd9e9-3965-4836-9a19-575baec01dcf';