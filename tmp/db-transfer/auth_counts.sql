select 'auth.users' as table_name, count(*)::text from auth.users
union all select 'auth.identities', count(*)::text from auth.identities
union all select 'auth.mfa_factors', count(*)::text from auth.mfa_factors
union all select 'auth.sessions', count(*)::text from auth.sessions
union all select 'auth.refresh_tokens', count(*)::text from auth.refresh_tokens
order by 1;
