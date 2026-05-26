
-- 1. Fix privilege escalation in procedure_documents
DROP POLICY IF EXISTS "Admins can do everything on procedure_documents" ON public.procedure_documents;

CREATE POLICY "Admins manage procedure_documents"
ON public.procedure_documents
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

-- 2. Remove broad authenticated write policies on media bucket
DROP POLICY IF EXISTS "Allow authenticated uploads for media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates for media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes for media" ON storage.objects;

-- 3. Restrict public listing of media bucket; keep direct URL access working
-- Drop any overly broad public SELECT on media
DROP POLICY IF EXISTS "Public read access for media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read for media" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;

-- Admins can list/select all
CREATE POLICY "Admins can list media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'media'
  AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role)
);

-- 4. Restrict sensitive regulatory fields in site_settings
DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;

-- Admins keep full read access through "Admins manage site settings" (already exists)
-- Public reads only non-sensitive contact fields via a view
CREATE OR REPLACE VIEW public.site_settings_public AS
SELECT
  id,
  whatsapp,
  phone,
  address,
  cep,
  google_maps_url,
  rt_image,
  rt_name,
  updated_at
FROM public.site_settings;

GRANT SELECT ON public.site_settings_public TO anon, authenticated;
