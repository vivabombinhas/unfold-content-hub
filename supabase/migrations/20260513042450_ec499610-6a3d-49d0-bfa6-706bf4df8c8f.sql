ALTER TABLE public.pages 
ADD COLUMN is_reviewed BOOLEAN DEFAULT FALSE,
ADD COLUMN fidelity_score TEXT CHECK (fidelity_score IN ('low', 'medium', 'high')),
ADD COLUMN seo_score INTEGER DEFAULT 0,
ADD COLUMN compliance_score INTEGER DEFAULT 0,
ADD COLUMN last_scanned_at TIMESTAMP WITH TIME ZONE;

-- Add index for better filtering in the Control Tower
CREATE INDEX idx_pages_is_reviewed ON public.pages(is_reviewed);
CREATE INDEX idx_pages_fidelity_score ON public.pages(fidelity_score);
CREATE INDEX idx_pages_status ON public.pages(status);
