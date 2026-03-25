
-- Add missing columns to profiles table and create countries table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'light';

-- Create countries table for dropdown
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert common countries
INSERT INTO public.countries (name, code) VALUES
  ('Argentina', 'AR'),
  ('Chile', 'CL'),
  ('Colombia', 'CO'),
  ('México', 'MX'),
  ('Perú', 'PE'),
  ('Uruguay', 'UY'),
  ('España', 'ES'),
  ('Estados Unidos', 'US')
ON CONFLICT (code) DO NOTHING;

-- Enable RLS on countries table
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Create policy for countries (public read)
CREATE POLICY "Anyone can view countries" ON public.countries
  FOR SELECT USING (true);

-- Create missing plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric,
  company_id uuid REFERENCES public.companies(id),
  active boolean DEFAULT true,
  coverage_details jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on plans table if not already enabled
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Create plans policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND policyname = 'Users can view company plans') THEN
    CREATE POLICY "Users can view company plans" ON public.plans
      FOR SELECT TO authenticated
      USING (company_id = (SELECT get_user_company(auth.uid())));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND policyname = 'Admins can manage company plans') THEN
    CREATE POLICY "Admins can manage company plans" ON public.plans
      FOR ALL TO authenticated
      USING (((SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::user_role, 'gestor'::user_role, 'super_admin'::user_role])) AND (company_id = (SELECT get_user_company(auth.uid()))));
  END IF;
END $$;

-- Add trigger for updated_at on plans
CREATE OR REPLACE TRIGGER handle_updated_at_plans
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
