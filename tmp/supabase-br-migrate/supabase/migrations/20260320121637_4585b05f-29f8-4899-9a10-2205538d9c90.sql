-- Restore missing super_admin role for the affected user
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'super_admin'::public.app_role
FROM public.profiles p
WHERE lower(p.email) = lower('dalton9302@gmail.com')
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.role = 'super_admin'::public.app_role
  );