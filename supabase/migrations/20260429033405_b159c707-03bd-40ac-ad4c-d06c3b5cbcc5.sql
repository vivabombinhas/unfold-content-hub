-- Allow authenticated users to execute the private role-check helper used by RLS policies.
-- This function lives outside the exposed public API schema and is required for admin policies to evaluate.
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) FROM anon, public;

-- Avoid calling the admin helper from policies that apply to public visitors.
DROP POLICY IF EXISTS "Public can read published pages" ON public.pages;
CREATE POLICY "Public can read published pages"
  ON public.pages
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published'::public.page_status);

DROP POLICY IF EXISTS "Public can read blocks of published pages" ON public.page_blocks;
CREATE POLICY "Public can read blocks of published pages"
  ON public.page_blocks
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pages p
      WHERE p.id = page_blocks.page_id
        AND p.status = 'published'::public.page_status
    )
  );