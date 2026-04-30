DROP POLICY IF EXISTS "Public can read published pages" ON public.pages;
CREATE POLICY "Public can read published pages"
  ON public.pages FOR SELECT TO anon, authenticated
  USING (status = 'published'::public.page_status);

DROP POLICY IF EXISTS "Public can read blocks of published pages" ON public.page_blocks;
CREATE POLICY "Public can read blocks of published pages"
  ON public.page_blocks FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pages p
      WHERE p.id = page_blocks.page_id
        AND p.status = 'published'::public.page_status
    )
  );

REVOKE EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) FROM anon;