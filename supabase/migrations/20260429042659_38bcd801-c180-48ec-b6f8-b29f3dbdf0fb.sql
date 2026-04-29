-- Lock down SECURITY DEFINER helper: only callable by service role / postgres
REVOKE EXECUTE ON FUNCTION app_private.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;

-- Re-affirm immutable search_path on both functions
ALTER FUNCTION app_private.has_role(uuid, app_role) SET search_path = public, app_private;
ALTER FUNCTION public.set_updated_at() SET search_path = public;