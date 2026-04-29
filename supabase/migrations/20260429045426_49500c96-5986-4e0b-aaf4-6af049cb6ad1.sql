-- Restore EXECUTE on app_private.has_role to authenticated and anon roles.
-- This is required because RLS policies across many tables call this function
-- during query evaluation. Without EXECUTE, the policy check raises a permission
-- error, which breaks admin login flows ("Sem permissão") and all RLS-protected
-- reads/writes for authenticated users.
--
-- The function is SECURITY DEFINER with a fixed search_path and only returns
-- a boolean about whether a given user has a given role — it does not expose
-- any data and cannot be abused to escalate privileges (the caller passes the
-- user id, but the function only confirms membership in user_roles).

GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, app_role) TO authenticated, anon;