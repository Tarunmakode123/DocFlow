
-- Create storage bucket for student image uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('student-uploads', 'student-uploads', false);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Students upload own images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'student-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own uploads
CREATE POLICY "Students read own images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'student-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own uploads
CREATE POLICY "Students update own images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'student-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Students delete own images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'student-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow service role to read all uploads (for edge function document generation)
CREATE POLICY "Service role reads all uploads"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'student-uploads');
