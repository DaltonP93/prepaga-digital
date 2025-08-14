
-- Create company currency settings table
CREATE TABLE public.company_currency_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'GS',
  currency_symbol VARCHAR(10) NOT NULL DEFAULT 'Gs.',
  currency_position VARCHAR(10) NOT NULL DEFAULT 'before', -- 'before' or 'after'
  decimal_places INTEGER NOT NULL DEFAULT 0,
  thousands_separator VARCHAR(1) NOT NULL DEFAULT '.',
  decimal_separator VARCHAR(1) NOT NULL DEFAULT ',',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Add RLS policies
ALTER TABLE public.company_currency_settings ENABLE ROW LEVEL SECURITY;

-- Company users can view their currency settings
CREATE POLICY "Company users can view currency settings" 
  ON public.company_currency_settings 
  FOR SELECT 
  USING (company_id = get_user_company(auth.uid()));

-- Admins can manage company currency settings
CREATE POLICY "Admins can manage currency settings" 
  ON public.company_currency_settings 
  FOR ALL 
  USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
  );

-- Super admins can manage all currency settings
CREATE POLICY "Super admins can manage all currency settings" 
  ON public.company_currency_settings 
  FOR ALL 
  USING (get_user_role(auth.uid()) = 'super_admin'::user_role);

-- Create trigger for updated_at
CREATE TRIGGER handle_company_currency_settings_updated_at 
  BEFORE UPDATE ON public.company_currency_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION handle_updated_at();

-- Insert default currency settings for existing companies
INSERT INTO public.company_currency_settings (company_id, currency_code, currency_symbol)
SELECT id, 'GS', 'Gs.' FROM public.companies
ON CONFLICT (company_id) DO NOTHING;
