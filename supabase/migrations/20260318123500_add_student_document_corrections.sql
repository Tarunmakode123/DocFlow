CREATE TABLE IF NOT EXISTS public.student_document_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_document_id UUID NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  requested_by UUID,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.student_document_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own corrections"
  ON public.student_document_corrections
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT id FROM public.student_documents WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Students can resolve own corrections"
  ON public.student_document_corrections
  FOR UPDATE
  USING (
    student_document_id IN (
      SELECT id FROM public.student_documents WHERE student_id = auth.uid()
    )
  )
  WITH CHECK (
    student_document_id IN (
      SELECT id FROM public.student_documents WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view corrections for own templates"
  ON public.student_document_corrections
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT sd.id
      FROM public.student_documents sd
      JOIN public.documents d ON d.id = sd.source_document_id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create corrections for own templates"
  ON public.student_document_corrections
  FOR INSERT
  WITH CHECK (
    student_document_id IN (
      SELECT sd.id
      FROM public.student_documents sd
      JOIN public.documents d ON d.id = sd.source_document_id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update corrections for own templates"
  ON public.student_document_corrections
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
