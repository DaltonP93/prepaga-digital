
-- Crear bucket para documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  true, 
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Crear bucket para avatares
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Políticas para bucket de documentos
CREATE POLICY "Company users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  get_user_role(auth.uid()) IS NOT NULL
);

CREATE POLICY "Company users can view documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Company users can update documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL AND
  get_user_role(auth.uid()) IS NOT NULL
);

CREATE POLICY "Public signature access to documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  name LIKE '%/signature/%'
);

-- Políticas para bucket de avatares
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view avatars" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Agregar columna para archivos firmados en la tabla sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS signed_document_url TEXT;

-- Crear tabla para tracking de archivos
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  bucket_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para file_uploads
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own uploads" ON public.file_uploads
FOR ALL USING (user_id = auth.uid());

-- Trigger para updated_at en file_uploads
CREATE TRIGGER handle_updated_at_file_uploads
  BEFORE UPDATE ON public.file_uploads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
