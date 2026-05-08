-- Create scraping_logs table
CREATE TABLE public.scraping_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT,
    task_type TEXT NOT NULL, -- 'scrape', 'search', 'research', 'scan'
    source_origin TEXT, -- 'batel_legacy', 'external_reference', 'manual_paste'
    content_snapshot TEXT, -- Truncated or full content captured
    extracted_data JSONB, -- The structured data extracted by AI
    metadata JSONB DEFAULT '{}'::jsonb, -- HTTP status, headers, chars count, etc.
    status TEXT DEFAULT 'success', -- 'success', 'error', 'partial'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scraping_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (Admins only)
CREATE POLICY "Admins can view scraping logs" 
ON public.scraping_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert scraping logs" 
ON public.scraping_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Index for performance
CREATE INDEX idx_scraping_logs_url ON public.scraping_logs(url);
CREATE INDEX idx_scraping_logs_created_at ON public.scraping_logs(created_at);