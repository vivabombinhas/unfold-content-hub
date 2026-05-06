-- Nenhuma mudança de schema necessária, pois usaremos a coluna metadata (jsonb) existente na tabela pages.
-- Mas vou adicionar um comentário para documentar o novo campo esperado no metadata.
COMMENT ON COLUMN public.pages.metadata IS 'Contém metadados da página, incluindo image_candidates: Array<{url, source, alt, confidence_score, status, suggested_usage}>';