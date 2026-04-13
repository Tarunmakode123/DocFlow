ALTER TABLE public.document_fields
  ADD COLUMN IF NOT EXISTS min_length INTEGER,
  ADD COLUMN IF NOT EXISTS max_length INTEGER,
  ADD COLUMN IF NOT EXISTS validation_pattern TEXT,
  ADD COLUMN IF NOT EXISTS validation_message TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'document_fields'
      AND policyname = 'Users can update fields for own docs'
  ) THEN
    CREATE POLICY "Users can update fields for own docs"
      ON public.document_fields
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.documents d
          WHERE d.id = document_id
            AND d.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.documents d
          WHERE d.id = document_id
            AND d.user_id = auth.uid()
        )
      );
  END IF;
END
$$;
