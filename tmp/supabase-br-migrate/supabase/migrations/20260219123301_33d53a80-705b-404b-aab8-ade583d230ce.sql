
-- Create template_attachments table for annexes
CREATE TABLE public.template_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.template_attachments ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view attachments for templates in their company
CREATE POLICY "Users can view template attachments"
ON public.template_attachments
FOR SELECT
USING (
  template_id IN (
    SELECT t.id FROM templates t
    WHERE t.company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
);

-- RLS: Admins can manage template attachments
CREATE POLICY "Admins can manage template attachments"
ON public.template_attachments
FOR ALL
USING (
  template_id IN (
    SELECT t.id FROM templates t
    WHERE t.company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid()
      AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
    )
  )
)
WITH CHECK (
  template_id IN (
    SELECT t.id FROM templates t
    WHERE t.company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid()
      AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
    )
  )
);

-- Allow vendedores to also manage attachments for their company templates
CREATE POLICY "Company users can manage template attachments"
ON public.template_attachments
FOR ALL
USING (
  template_id IN (
    SELECT t.id FROM templates t
    WHERE t.company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
)
WITH CHECK (
  template_id IN (
    SELECT t.id FROM templates t
    WHERE t.company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
);
