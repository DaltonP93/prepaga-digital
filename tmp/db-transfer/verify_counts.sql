select 'sales' as table_name, count(*)::text as row_count from public.sales
union all select 'clients', count(*)::text from public.clients
union all select 'beneficiaries', count(*)::text from public.beneficiaries
union all select 'documents', count(*)::text from public.documents
union all select 'templates', count(*)::text from public.templates
union all select 'profiles', count(*)::text from public.profiles
union all select 'plans', count(*)::text from public.plans
union all select 'signature_links', count(*)::text from public.signature_links
union all select 'incidents', count(*)::text from public.incidents
union all select 'companies', count(*)::text from public.companies
order by table_name;
