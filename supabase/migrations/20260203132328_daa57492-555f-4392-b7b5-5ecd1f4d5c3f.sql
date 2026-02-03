-- =============================================
-- Security Fix: Restrict template_responses INSERT policy
-- Issue: PUBLIC_DATA_EXPOSURE - template_responses_open_insert
-- Previously allowed any authenticated user to insert responses
-- Now restricted to sales with valid, non-expired signature tokens
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can insert template responses" ON public.template_responses;
DROP POLICY IF EXISTS "Clients can insert template responses" ON public.template_responses;

-- Create restrictive INSERT policy for template responses
-- Only allow insertion when:
-- 1. The sale has a valid signature token
-- 2. The signature token hasn't expired
CREATE POLICY "Clients can insert template responses via valid token" 
  ON public.template_responses 
  FOR INSERT 
  WITH CHECK (
    sale_id IN (
      SELECT id FROM public.sales 
      WHERE signature_token IS NOT NULL 
      AND (signature_expires_at IS NULL OR signature_expires_at > now())
    )
  );

-- =============================================
-- Security Fix: Make storage buckets private
-- Issue: STORAGE_EXPOSURE - public_storage_buckets
-- =============================================

-- Make documents bucket private (sensitive client data)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'documents';

-- Make avatars bucket private (user data)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'avatars';

-- Update storage policies to use authenticated access only
-- Drop existing public access policies
DROP POLICY IF EXISTS "Public access to signature documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Create policy for authenticated avatar access
CREATE POLICY "Authenticated users can view avatars"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

-- Create policy for authenticated document access
CREATE POLICY "Authenticated users can view documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

-- =============================================
-- Note: SECURITY DEFINER functions are intentional
-- has_role() and get_user_role() MUST use SECURITY DEFINER
-- to avoid infinite recursion in RLS policies.
-- All functions already have proper search_path set.
-- =============================================