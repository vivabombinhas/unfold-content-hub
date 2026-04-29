-- Remove the unused public.has_role duplicate; all RLS policies use app_private.has_role.
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);