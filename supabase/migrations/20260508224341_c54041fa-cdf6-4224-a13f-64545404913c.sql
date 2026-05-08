CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE public.image_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  category TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.image_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Image bank is viewable by everyone" 
ON public.image_bank 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify image bank" 
ON public.image_bank 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE TRIGGER update_image_bank_updated_at
BEFORE UPDATE ON public.image_bank
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();