-- Hardening: revoke EXECUTE on has_role from anon (only authenticated/service_role need it for RLS).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) FROM anon, authenticated, public;