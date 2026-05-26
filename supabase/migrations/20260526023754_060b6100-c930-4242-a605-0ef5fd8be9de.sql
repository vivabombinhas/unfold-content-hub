-- Create document_type enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE document_type AS ENUM ('tcle', 'technical_differential');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
        CREATE TYPE document_status AS ENUM ('draft', 'reviewed', 'approved', 'published');
    END IF;
END $$;

-- Create procedure_documents table
CREATE TABLE IF NOT EXISTS public.procedure_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    html_content TEXT,
    status document_status NOT NULL DEFAULT 'draft',
    source_context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(page_id, document_type),
    UNIQUE(document_type, slug)
);

-- Enable RLS
ALTER TABLE public.procedure_documents ENABLE ROW LEVEL SECURITY;

-- Policies for procedure_documents
CREATE POLICY "Public can view published documents" 
ON public.procedure_documents 
FOR SELECT 
USING (status = 'published');

CREATE POLICY "Admins can do everything on procedure_documents" 
ON public.procedure_documents 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.uid() = id AND (raw_user_meta_data->>'role')::text = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.uid() = id AND (raw_user_meta_data->>'role')::text = 'admin'
    )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_procedure_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_procedure_documents_updated_at
BEFORE UPDATE ON public.procedure_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_procedure_documents_updated_at();
