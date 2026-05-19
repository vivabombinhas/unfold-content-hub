
CREATE OR REPLACE FUNCTION public.autofill_page_url_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  reserved text[] := ARRAY['admin', 'api', 'p', 'auth', 'assets', 'lovable', 'static'];
BEGIN
  -- Defaults
  IF NEW.categoria IS NULL OR NEW.categoria = '' THEN
    NEW.categoria := 'protocolo-batel';
  END IF;
  IF NEW.cidade IS NULL OR NEW.cidade = '' THEN
    NEW.cidade := 'curitiba';
  END IF;
  IF NEW.procedimento IS NULL OR NEW.procedimento = '' THEN
    NEW.procedimento := NEW.slug;
  END IF;

  -- Validate segments
  IF NEW.procedimento !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'procedimento inválido: % (use apenas a-z, 0-9, hífen)', NEW.procedimento;
  END IF;
  IF NEW.cidade !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'cidade inválida: %', NEW.cidade;
  END IF;
  IF NEW.modificador IS NOT NULL AND NEW.modificador <> '' AND NEW.modificador !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'modificador inválido: %', NEW.modificador;
  END IF;
  IF NEW.categoria = ANY(reserved) AND NEW.categoria <> 'protocolo-batel' THEN
    RAISE EXCEPTION 'categoria reservada: %', NEW.categoria;
  END IF;
  IF NEW.procedimento = ANY(reserved) THEN
    RAISE EXCEPTION 'procedimento reservado: %', NEW.procedimento;
  END IF;

  -- Auto-build url_path if not overridden manually
  IF NOT COALESCE(NEW.slug_override, false) THEN
    NEW.url_path := NEW.categoria || '/' || NEW.procedimento || '/em-' || NEW.cidade
      || CASE WHEN NEW.modificador IS NOT NULL AND NEW.modificador <> '' THEN '/' || NEW.modificador ELSE '' END;
  ELSIF NEW.url_path IS NULL OR NEW.url_path = '' THEN
    NEW.url_path := NEW.categoria || '/' || NEW.procedimento || '/em-' || NEW.cidade;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pages_autofill_url ON public.pages;
CREATE TRIGGER pages_autofill_url
  BEFORE INSERT OR UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.autofill_page_url_fields();
