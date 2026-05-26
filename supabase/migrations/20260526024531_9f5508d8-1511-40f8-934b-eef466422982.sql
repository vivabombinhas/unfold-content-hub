
ALTER VIEW public.site_settings_public SET (security_invoker = true);

-- Re-create public SELECT policy on site_settings restricted to safe columns is not possible at column level via RLS,
-- so we expose via the security_invoker view; grant explicit table-level SELECT on the safe columns to anon/authenticated
-- so the view works for unauthenticated users.
GRANT SELECT (id, whatsapp, phone, address, cep, google_maps_url, rt_image, rt_name, updated_at)
ON public.site_settings TO anon, authenticated;

-- Need a permissive RLS policy that allows the view's SELECT to actually return rows.
-- Restrict to columns is handled at the view; here we allow row-level read but app should query the view.
CREATE POLICY "Public can read non-sensitive site settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);
