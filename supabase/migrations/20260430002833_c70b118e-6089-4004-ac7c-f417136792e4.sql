-- Atomic delete page function with admin check and cascading cleanup of dependents.
CREATE OR REPLACE FUNCTION public.admin_delete_page(_page_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  _is_admin boolean;
  _page record;
  _blocks_deleted int;
  _overrides_deleted int;
BEGIN
  -- Authorization: must be admin
  SELECT app_private.has_role(auth.uid(), 'admin'::app_role) INTO _is_admin;
  IF NOT COALESCE(_is_admin, false) THEN
    RAISE EXCEPTION 'forbidden: admin role required'
      USING ERRCODE = '42501';
  END IF;

  -- Existence check
  SELECT id, title, slug, status INTO _page
  FROM public.pages
  WHERE id = _page_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'page not found: %', _page_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Cleanup dependents atomically (all in one transaction)
  DELETE FROM public.page_blocks WHERE page_id = _page_id;
  GET DIAGNOSTICS _blocks_deleted = ROW_COUNT;

  DELETE FROM public.case_page_overrides WHERE page_id = _page_id;
  GET DIAGNOSTICS _overrides_deleted = ROW_COUNT;

  -- Finally remove the page itself
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

-- Lock down execution: only authenticated admins go through; rely on internal has_role check.
REVOKE ALL ON FUNCTION public.admin_delete_page(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_page(uuid) TO authenticated;