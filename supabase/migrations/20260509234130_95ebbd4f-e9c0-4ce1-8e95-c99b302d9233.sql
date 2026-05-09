-- Drop existing restricted policies
DROP POLICY IF EXISTS "Public can read published pages" ON public.pages;
DROP POLICY IF EXISTS "Public can read blocks of published pages" ON public.page_blocks;

-- Create more permissive SELECT policies for public viewing (slugs act as access tokens for drafts)
CREATE POLICY "Public can read all pages" 
ON public.pages FOR SELECT 
USING (true);

CREATE POLICY "Public can read all page blocks" 
ON public.page_blocks FOR SELECT 
USING (true);
