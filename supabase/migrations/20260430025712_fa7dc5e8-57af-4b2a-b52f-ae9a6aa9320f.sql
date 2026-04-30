DO $$
DECLARE
  admin_check text := 'EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ''admin''::public.app_role)';
BEGIN
  -- user_roles: users can read their own role; role assignment stays backend-managed.
  DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
  DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
  CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

  -- pages
  DROP POLICY IF EXISTS "Admins manage pages" ON public.pages;
  CREATE POLICY "Admins manage pages"
    ON public.pages FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

  -- page_blocks
  DROP POLICY IF EXISTS "Admins manage blocks" ON public.page_blocks;
  CREATE POLICY "Admins manage blocks"
    ON public.page_blocks FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

  -- admin-managed content pools
  DROP POLICY IF EXISTS "Admins manage cases" ON public.cases;
  CREATE POLICY "Admins manage cases"
    ON public.cases FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

  DROP POLICY IF EXISTS "Admins manage case overrides" ON public.case_page_overrides;
  CREATE POLICY "Admins manage case overrides"
    ON public.case_page_overrides FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

  DROP POLICY IF EXISTS "Admins manage faqs" ON public.faqs;
  CREATE POLICY "Admins manage faqs"
    ON public.faqs FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

  DROP POLICY IF EXISTS "Admins manage reviews" ON public.reviews;
  CREATE POLICY "Admins manage reviews"
    ON public.reviews FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

  DROP POLICY IF EXISTS "Admins manage ai opinions" ON public.ai_opinions;
  CREATE POLICY "Admins manage ai opinions"
    ON public.ai_opinions FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

  DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
  CREATE POLICY "Admins manage courses"
    ON public.courses FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

  DROP POLICY IF EXISTS "Admins manage site settings" ON public.site_settings;
  CREATE POLICY "Admins manage site settings"
    ON public.site_settings FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

  -- media storage admin policies
  DROP POLICY IF EXISTS "Admins can upload media" ON storage.objects;
  CREATE POLICY "Admins can upload media"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'media' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

  DROP POLICY IF EXISTS "Admins can update media" ON storage.objects;
  CREATE POLICY "Admins can update media"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'media' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

  DROP POLICY IF EXISTS "Admins can delete media" ON storage.objects;
  CREATE POLICY "Admins can delete media"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'media' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_page(_page_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _page record;
  _blocks_deleted int;
  _overrides_deleted int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'forbidden: admin role required' USING ERRCODE = '42501';
  END IF;

  SELECT id, title, slug, status INTO _page
  FROM public.pages
  WHERE id = _page_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'page not found: %', _page_id USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.page_blocks WHERE page_id = _page_id;
  GET DIAGNOSTICS _blocks_deleted = ROW_COUNT;

  DELETE FROM public.case_page_overrides WHERE page_id = _page_id;
  GET DIAGNOSTICS _overrides_deleted = ROW_COUNT;

  DELETE FROM public.pages WHERE id = _page_id;

  RETURN jsonb_build_object(
    'deleted_page_id', _page_id,
    'slug', _page.slug,
    'title', _page.title,
    'blocks_deleted', _blocks_deleted,
    'overrides_deleted', _overrides_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_page(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_page(uuid) FROM anon, public;
DROP FUNCTION IF EXISTS app_private.has_role(uuid, public.app_role);