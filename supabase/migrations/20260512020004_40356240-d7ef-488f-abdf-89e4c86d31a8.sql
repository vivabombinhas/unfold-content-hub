ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS source_snapshot TEXT;

COMMENT ON COLUMN public.pages.source_metadata IS 'Metadata about where the page content came from (e.g., legacy URL, extraction status, domain detection).';
COMMENT ON COLUMN public.pages.source_snapshot IS 'Full raw content (HTML/Markdown) extracted from the source for future auditing and diffing.';