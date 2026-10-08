INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'Events',
  'Events',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "Admins upload event banners" ON storage.objects;
CREATE POLICY "Admins upload event banners"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Events'
  AND public.is_admin(auth.uid())
);
