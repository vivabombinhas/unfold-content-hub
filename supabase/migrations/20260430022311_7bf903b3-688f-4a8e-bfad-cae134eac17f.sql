-- Revoke EXECUTE from anon/authenticated on internal helper functions.
-- These are called from RLS policies (has_role) or as triggers (set_updated_at)
-- and should not be callable directly via PostgREST.

REVOKE EXECUTE ON FUNCTION app_private.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;

-- admin_delete_page deliberately keeps EXECUTE for authenticated:
-- it performs an internal admin role check before doing anything,
-- and is the documented way for the admin UI to delete a page atomically.
-- No change needed there.