DROP INDEX IF EXISTS public.idx_signature_links_token;

CREATE TABLE IF NOT EXISTS public.document_print_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  pdf_url text NOT NULL,
  pdf_hash text,
  reason text,
  generated_by uuid,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.document_print_versions
  ADD COLUMN IF NOT EXISTS document_id uuid,
  ADD COLUMN IF NOT EXISTS sale_id uuid,
  ADD COLUMN IF NOT EXISTS version_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS pdf_hash text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS generated_by uuid,
  ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_print_versions_document_id_fkey'
      AND conrelid = 'public.document_print_versions'::regclass
  ) THEN
    ALTER TABLE public.document_print_versions
      ADD CONSTRAINT document_print_versions_document_id_fkey
      FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_print_versions_sale_id_fkey'
      AND conrelid = 'public.document_print_versions'::regclass
  ) THEN
    ALTER TABLE public.document_print_versions
      ADD CONSTRAINT document_print_versions_sale_id_fkey
      FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.document_print_versions AS dpv
SET sale_id = d.sale_id
FROM public.documents AS d
WHERE dpv.document_id = d.id
  AND dpv.sale_id IS NULL;

ALTER TABLE public.document_print_versions
  ALTER COLUMN document_id SET NOT NULL,
  ALTER COLUMN version_number SET NOT NULL,
  ALTER COLUMN pdf_url SET NOT NULL,
  ALTER COLUMN is_current SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.document_print_versions
    WHERE sale_id IS NULL
  ) THEN
    ALTER TABLE public.document_print_versions
      ALTER COLUMN sale_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_document_print_versions_document_id
  ON public.document_print_versions(document_id);

CREATE INDEX IF NOT EXISTS idx_document_print_versions_sale_id
  ON public.document_print_versions(sale_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_document_print_versions_document_version
  ON public.document_print_versions(document_id, version_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_document_print_versions_current
  ON public.document_print_versions(document_id)
  WHERE is_current = true;

ALTER TABLE public.document_print_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company print versions" ON public.document_print_versions;
CREATE POLICY "Users can view company print versions"
ON public.document_print_versions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.sales AS s
    WHERE s.id = document_print_versions.sale_id
      AND s.company_id = public.get_user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can manage company print versions" ON public.document_print_versions;
CREATE POLICY "Admins can manage company print versions"
ON public.document_print_versions
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR (
    EXISTS (
      SELECT 1
      FROM public.sales AS s
      WHERE s.id = document_print_versions.sale_id
        AND s.company_id = public.get_user_company_id(auth.uid())
    )
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'supervisor'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR (
    EXISTS (
      SELECT 1
      FROM public.sales AS s
      WHERE s.id = document_print_versions.sale_id
        AND s.company_id = public.get_user_company_id(auth.uid())
    )
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'supervisor'::public.app_role)
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    )
  )
);

NOTIFY pgrst, 'reload schema';
