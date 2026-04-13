CREATE TABLE IF NOT EXISTS public.student_document_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_document_id UUID NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  review_comment TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_document_id)
);

ALTER TABLE public.student_document_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own submission reviews"
  ON public.student_document_reviews
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT id FROM public.student_documents WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view reviews for own templates"
  ON public.student_document_reviews
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT sd.id
      FROM public.student_documents sd
      JOIN public.documents d ON d.id = sd.source_document_id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create reviews for own templates"
  ON public.student_document_reviews
  FOR INSERT
  WITH CHECK (
    student_document_id IN (
      SELECT sd.id
      FROM public.student_documents sd
      JOIN public.documents d ON d.id = sd.source_document_id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update reviews for own templates"
  ON public.student_document_reviews
  FOR UPDATE
  USING (
    student_document_id IN (
      SELECT sd.id
      FROM public.student_documents sd
      JOIN public.documents d ON d.id = sd.source_document_id
      WHERE d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    student_document_id IN (
      SELECT sd.id
      FROM public.student_documents sd
      JOIN public.documents d ON d.id = sd.source_document_id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.set_student_document_reviews_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_student_document_reviews_updated_at_trigger ON public.student_document_reviews;
CREATE TRIGGER set_student_document_reviews_updated_at_trigger
BEFORE UPDATE ON public.student_document_reviews
FOR EACH ROW
EXECUTE FUNCTION public.set_student_document_reviews_updated_at();
