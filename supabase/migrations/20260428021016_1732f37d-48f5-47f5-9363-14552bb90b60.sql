-- Restore execute permission required for RLS policies and admin checks
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
