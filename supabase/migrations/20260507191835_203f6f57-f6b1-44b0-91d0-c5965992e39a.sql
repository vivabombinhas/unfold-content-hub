-- Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for public read access
CREATE POLICY "Allow public read access for media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Policy for authenticated uploads
CREATE POLICY "Allow authenticated uploads for media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Policy for authenticated updates
CREATE POLICY "Allow authenticated updates for media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media');

-- Policy for authenticated deletes
CREATE POLICY "Allow authenticated deletes for media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');