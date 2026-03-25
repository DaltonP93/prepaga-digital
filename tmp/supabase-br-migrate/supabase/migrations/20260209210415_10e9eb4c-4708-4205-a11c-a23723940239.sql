-- Assign super_admin role to dalton9302@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('a91bd9e9-3965-4836-9a19-575baec01dcf', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;