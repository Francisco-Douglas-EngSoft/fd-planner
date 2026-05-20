INSERT INTO storage.buckets (id, name, public)
VALUES ('course-covers', 'course-covers', true);

CREATE POLICY "Users can upload course covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view course covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-covers');

CREATE POLICY "Users can update own course covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own course covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-covers' AND (storage.foldername(name))[1] = auth.uid()::text);