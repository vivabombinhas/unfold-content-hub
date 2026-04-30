ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.pages.metadata IS
  'Phase 1: contextual notes for the page (tema, categoria, area_anatomica, ai_notes, links_referencia, sources). Used by generate-page-from-topic and the admin editor.';