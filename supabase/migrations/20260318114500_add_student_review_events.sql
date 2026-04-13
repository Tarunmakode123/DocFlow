CREATE TABLE IF NOT EXISTS public.student_document_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_document_id UUID NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
  review_status TEXT NOT NULL CHECK (review_status IN ('approved', 'rejected', 'pending')),
  review_comment TEXT,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_document_review_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own review events"
  ON public.student_document_review_events
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT id FROM public.student_documents WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view review events for own templates"
  ON public.student_document_review_events
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT sd.id
      FROM public.student_documents sd
      JOIN public.documents d ON d.id = sd.source_document_id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create review events for own templates"
  ON public.student_document_review_events
  FOR INSERT
  WITH CHECK (
    student_document_id IN (
      SELECT sd.id
      FROM public.student_documents sd
      JOIN public.documents d ON d.id = sd.source_document_id
      WHERE d.user_id = auth.uid()
    )
  );
