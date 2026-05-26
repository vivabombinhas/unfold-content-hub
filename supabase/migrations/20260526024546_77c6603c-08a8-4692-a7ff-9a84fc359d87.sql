
-- Revoke broad SELECT and grant only safe columns to public roles
REVOKE SELECT ON public.site_settings FROM anon, authenticated;

GRANT SELECT (id, whatsapp, phone, address, cep, google_maps_url, rt_image, rt_name, updated_at)
ON public.site_settings TO anon, authenticated;

-- Admins keep full table access via existing admin policy + ownership
GRANT SELECT ON public.site_settings TO service_role;
