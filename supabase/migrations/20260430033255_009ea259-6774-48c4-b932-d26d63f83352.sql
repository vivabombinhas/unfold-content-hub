-- Fase 1.2: novo block_type opcional para preservar seções fortes
-- de páginas antigas próprias da clínica, mantendo design da página nova.
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'procedimento_detalhado';