ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS long_description TEXT,
ADD COLUMN IF NOT EXISTS price_label TEXT;