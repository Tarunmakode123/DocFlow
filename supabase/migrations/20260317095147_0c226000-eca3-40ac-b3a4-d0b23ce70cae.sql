
CREATE TABLE public.template_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_document_id UUID REFERENCES public.student_documents(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  original_template_text TEXT NOT NULL,
  override_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.template_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own overrides"
  ON public.template_overrides FOR ALL
  USING (student_document_id IN (
    SELECT id FROM public.student_documents WHERE student_id = auth.uid()
  ));
