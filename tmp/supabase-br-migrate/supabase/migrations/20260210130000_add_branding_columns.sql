-- Add missing branding columns to companies table
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS accent_color text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS login_logo_url text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS login_background_url text;

-- Create storage bucket for company branding assets (logos, backgrounds)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to company-assets bucket
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

-- Allow public read access for company assets (logos need to be visible on login)
CREATE POLICY "Public can view company assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update company assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete company assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets');
