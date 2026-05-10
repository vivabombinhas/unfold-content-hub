-- Update admin_delete_page to prevent deleting the template page
CREATE OR REPLACE FUNCTION public.admin_delete_page(_page_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _page record;
  _blocks_deleted int;
  _overrides_deleted int;
BEGIN
  -- Security check: only admins
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'forbidden: admin role required' USING ERRCODE = '42501';
  END IF;

  -- Get page info
  SELECT id, title, slug, status INTO _page
  FROM public.pages
  WHERE id = _page_id;

  -- Validate existence
  IF NOT FOUND THEN
    RAISE EXCEPTION 'page not found: %', _page_id USING ERRCODE = 'P0002';
  END IF;

  -- CRITICAL PROTECTION: Do not delete the template page
  IF _page.slug = 'modelo' THEN
    RAISE EXCEPTION 'A página modelo não pode ser excluída.' USING ERRCODE = '45000';
  END IF;

  -- Delete related data
  DELETE FROM public.page_blocks WHERE page_id = _page_id;
  GET DIAGNOSTICS _blocks_deleted = ROW_COUNT;

  DELETE FROM public.case_page_overrides WHERE page_id = _page_id;
  GET DIAGNOSTICS _overrides_deleted = ROW_COUNT;

  -- Delete the page
  DELETE FROM public.pages WHERE id = _page_id;

  RETURN jsonb_build_object(
    'deleted_page_id', _page_id,
    'slug', _page.slug,
    'title', _page.title,
    'blocks_deleted', _blocks_deleted,
    'overrides_deleted', _overrides_deleted
  );
END;
$function$;

-- Second layer: database trigger to prevent accidental deletion of 'modelo' via any means
CREATE OR REPLACE FUNCTION public.protect_template_page()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.slug = 'modelo' THEN
        RAISE EXCEPTION 'A página modelo é vital para o sistema e não pode ser excluída.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_template_page ON public.pages;
CREATE TRIGGER tr_protect_template_page
BEFORE DELETE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION public.protect_template_page();