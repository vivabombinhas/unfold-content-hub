
-- 1. Enum para modificador_tipo
DO $$ BEGIN
  CREATE TYPE public.modificador_tipo AS ENUM ('publico', 'indicacao', 'objetivo', 'area_corporal');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Novas colunas em pages
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'protocolo-batel',
  ADD COLUMN IF NOT EXISTS procedimento text,
  ADD COLUMN IF NOT EXISTS cidade text NOT NULL DEFAULT 'curitiba',
  ADD COLUMN IF NOT EXISTS modificador text,
  ADD COLUMN IF NOT EXISTS modificador_tipo public.modificador_tipo,
  ADD COLUMN IF NOT EXISTS url_path text,
  ADD COLUMN IF NOT EXISTS slug_override boolean NOT NULL DEFAULT false;

-- 3. Backfill: deduzir procedimento do slug, montar url_path
UPDATE public.pages
SET procedimento = COALESCE(procedimento, slug),
    url_path = COALESCE(
      url_path,
      'protocolo-batel/' || slug || '/em-curitiba'
    )
WHERE slug != 'modelo';

-- Página modelo: url_path neutro
UPDATE public.pages
SET procedimento = COALESCE(procedimento, 'modelo'),
    url_path = COALESCE(url_path, 'modelo')
WHERE slug = 'modelo';

-- 4. Constraints após backfill
ALTER TABLE public.pages
  ALTER COLUMN procedimento SET NOT NULL,
  ALTER COLUMN url_path SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pages_url_path_unique ON public.pages(url_path);

-- 5. Tabela de redirects
CREATE TABLE IF NOT EXISTS public.slug_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_path text NOT NULL UNIQUE,
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slug_redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read redirects" ON public.slug_redirects;
CREATE POLICY "Public can read redirects"
  ON public.slug_redirects FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage redirects" ON public.slug_redirects;
CREATE POLICY "Admins manage redirects"
  ON public.slug_redirects FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role));

-- 6. Seed inicial: cada slug antigo vira redirect para o url_path novo
INSERT INTO public.slug_redirects (old_path, page_id)
SELECT slug, id FROM public.pages
WHERE slug != 'modelo' AND slug IS NOT NULL
ON CONFLICT (old_path) DO NOTHING;

-- 7. Trigger: ao mudar url_path, registra o antigo como redirect automaticamente
CREATE OR REPLACE FUNCTION public.register_url_path_redirect()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.url_path IS DISTINCT FROM NEW.url_path AND OLD.url_path IS NOT NULL THEN
    INSERT INTO public.slug_redirects (old_path, page_id)
    VALUES (OLD.url_path, NEW.id)
    ON CONFLICT (old_path) DO UPDATE SET page_id = EXCLUDED.page_id;

    -- Se o novo url_path bate com um redirect existente, remove (página recriada)
    DELETE FROM public.slug_redirects WHERE old_path = NEW.url_path;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pages_url_path_redirect ON public.pages;
CREATE TRIGGER pages_url_path_redirect
  AFTER UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.register_url_path_redirect();
