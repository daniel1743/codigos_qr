INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "owner_insert_avatar" ON storage.objects;
DROP POLICY IF EXISTS "owner_update_avatar" ON storage.objects;
DROP POLICY IF EXISTS "owner_delete_avatar" ON storage.objects;
DROP POLICY IF EXISTS "public_select_avatar" ON storage.objects;

CREATE POLICY "owner_insert_avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "owner_update_avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "owner_delete_avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "public_select_avatar"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');
