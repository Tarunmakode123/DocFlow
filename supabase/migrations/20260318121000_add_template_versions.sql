CREATE TABLE IF NOT EXISTS public.template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  action TEXT NOT NULL DEFAULT 'manual' CHECK (action IN ('manual', 'publish', 'unpublish', 'rollback')),
  notes TEXT,
  snapshot JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, version_number)
);

ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view versions for own templates"
  ON public.template_versions
  FOR SELECT
  USING (
    document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can create versions for own templates"
  ON public.template_versions
  FOR INSERT
  WITH CHECK (
    document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid())
  );
