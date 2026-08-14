-- Read-only catalog assertions for the commission module.
-- Safe to run in any environment after the four commission migrations.
BEGIN;

DO $$
DECLARE v_missing text;
BEGIN
  SELECT string_agg(expected.name, ', ' ORDER BY expected.name) INTO v_missing
  FROM (VALUES
    ('commission_promoter_types'), ('commission_salespeople'), ('commission_plan_settings'),
    ('commission_rules'), ('commission_settings'), ('commission_periods'), ('commission_items')
  ) expected(name)
  WHERE to_regclass('public.' || expected.name) IS NULL;
  IF v_missing IS NOT NULL THEN RAISE EXCEPTION 'missing commission tables: %', v_missing; END IF;
END $$;

DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname LIKE 'commission_%' AND c.relkind = 'r' AND c.relrowsecurity;
  IF v_count <> 7 THEN RAISE EXCEPTION 'expected RLS on 7 commission tables, found %', v_count; END IF;
END $$;

DO $$
DECLARE v_delete_action "char";
BEGIN
  SELECT confdeltype INTO v_delete_action
  FROM pg_constraint
  WHERE conrelid = 'public.commission_items'::regclass
    AND confrelid = 'public.sales'::regclass AND contype = 'f';
  IF v_delete_action IS DISTINCT FROM 'r' THEN
    RAISE EXCEPTION 'commission_items.sale_id must use ON DELETE RESTRICT';
  END IF;
END $$;

DO $$
DECLARE v_indexdef text;
BEGIN
  SELECT indexdef INTO v_indexdef FROM pg_indexes
  WHERE schemaname = 'public' AND indexname = 'commission_items_one_settlement_per_sale_idx';
  IF v_indexdef IS NULL OR v_indexdef NOT ILIKE '%UNIQUE%'
     OR v_indexdef NOT ILIKE '%WHERE%is_settled%' THEN
    RAISE EXCEPTION 'partial unique settled-sale index is missing or invalid: %', v_indexdef;
  END IF;
END $$;

DO $$
DECLARE v_nulls_not_distinct boolean;
BEGIN
  SELECT i.indnullsnotdistinct INTO v_nulls_not_distinct
  FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
  WHERE c.relname = 'commission_rules_dimensions_valid_from_key';
  IF v_nulls_not_distinct IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'commission rule dimension uniqueness must be NULLS NOT DISTINCT';
  END IF;
END $$;

DO $$
DECLARE v_name text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'commission_resolve_rule(uuid)',
    'commission_preview(uuid,uuid,date,date)',
    'commission_generate_period(uuid,uuid,date,date,text,text)',
    'commission_close_period(uuid)',
    'commission_pay_period(uuid)',
    'commission_annul_period(uuid,text)',
    'commission_list_salespeople(uuid)'
  ] LOOP
    IF to_regprocedure('public.' || v_name) IS NULL THEN RAISE EXCEPTION 'missing RPC: %', v_name; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('public.' || v_name)
        AND p.prosecdef AND p.proconfig @> ARRAY['search_path=public, pg_temp']
    ) THEN RAISE EXCEPTION 'RPC must be SECURITY DEFINER with safe search_path: %', v_name; END IF;
    IF has_function_privilege('anon', 'public.' || v_name, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon unexpectedly has EXECUTE on %', v_name;
    END IF;
    IF NOT has_function_privilege('authenticated', 'public.' || v_name, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated lacks EXECUTE on %', v_name;
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'commission_promoter_types', 'commission_salespeople', 'commission_plan_settings',
    'commission_rules', 'commission_settings', 'commission_periods', 'commission_items'
  ] LOOP
    IF has_table_privilege('anon', 'public.' || v_table, 'SELECT')
       OR has_table_privilege('anon', 'public.' || v_table, 'INSERT')
       OR has_table_privilege('anon', 'public.' || v_table, 'UPDATE')
       OR has_table_privilege('anon', 'public.' || v_table, 'DELETE') THEN
      RAISE EXCEPTION 'anon unexpectedly has table privilege on %', v_table;
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE v_name text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'commission_touch_updated_at()',
    'commission_validate_configuration_company()',
    'commission_validate_accounting_company()',
    'commission_require_rpc_mutation()',
    'commission_authorize_company(uuid,boolean)',
    'commission_calculate_sale(uuid)'
  ] LOOP
    IF has_function_privilege('anon', 'public.' || v_name, 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.' || v_name, 'EXECUTE') THEN
      RAISE EXCEPTION 'API role unexpectedly has EXECUTE on internal helper %', v_name;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.commission_periods'::regclass
      AND tgname = 'commission_periods_rpc_only' AND NOT tgisinternal
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.commission_items'::regclass
      AND tgname = 'commission_items_rpc_only' AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'RPC-only mutation triggers are missing'; END IF;
END $$;

ROLLBACK;
