select 'auth.users' as table_name, count(*)::text from auth.users
union all select 'auth.identities', count(*)::text from auth.identities
union all select 'auth.sessions', count(*)::text from auth.sessions
union all select 'auth.refresh_tokens', count(*)::text from auth.refresh_tokens
union all select 'storage.buckets', count(*)::text from storage.buckets
union all select 'storage.objects', count(*)::text from storage.objects
union all select 'vault.secrets', count(*)::text from vault.secrets
order by 1;
