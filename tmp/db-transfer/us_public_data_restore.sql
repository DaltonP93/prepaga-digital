SET session_replication_role = replica;
\i /work/us_public_data_inserts.sql
SET session_replication_role = origin;
