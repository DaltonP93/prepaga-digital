
-- Allow authenticated users to insert beneficiaries
CREATE POLICY "Allow authenticated users to insert beneficiaries"
ON public.beneficiaries
FOR INSERT TO authenticated
WITH CHECK (true);

-- Also ensure SELECT, UPDATE, DELETE policies exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'beneficiaries' AND policyname LIKE '%select%') THEN
    EXECUTE 'CREATE POLICY "Allow authenticated users to select beneficiaries" ON public.beneficiaries FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'beneficiaries' AND policyname LIKE '%update%') THEN
    EXECUTE 'CREATE POLICY "Allow authenticated users to update beneficiaries" ON public.beneficiaries FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'beneficiaries' AND policyname LIKE '%delete%') THEN
    EXECUTE 'CREATE POLICY "Allow authenticated users to delete beneficiaries" ON public.beneficiaries FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;
