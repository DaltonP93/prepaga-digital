select count(*) as missing_auth_users
from public.profiles p
left join auth.users u on u.id = p.id
where u.id is null;
