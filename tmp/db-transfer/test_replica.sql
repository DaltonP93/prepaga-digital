SET session_replication_role = replica;
SELECT current_user, current_setting(''session_replication_role'');
