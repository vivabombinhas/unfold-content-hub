-- Fix 1: search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix 2 & 3: revoke EXECUTE on has_role from anon/authenticated
-- It is only used inside RLS policies (which run as definer in PG context),
-- not callable from the API by users.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;

-- Fix 4: prevent listing of media bucket. Drop broad SELECT policy and
-- replace with a no-op that still lets clients fetch by exact path via
-- the public URL (which goes through render endpoint, not list).
DROP POLICY IF EXISTS "Public can read media" ON storage.objects;
-- (No SELECT policy on storage.objects for media = no listing via API.
-- Public URLs work because the bucket is marked public, served by the
-- storage CDN endpoint, which bypasses RLS for object fetch by path.)
