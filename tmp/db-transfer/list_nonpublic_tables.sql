select schemaname, tablename
from pg_tables
where schemaname not in ('pg_catalog','information_schema','public')
order by schemaname, tablename;
