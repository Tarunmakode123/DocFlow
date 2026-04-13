-- Fix broken views and add versioning support for optimistic locking

-- Step 1: Add updated_at to student_documents table for optimistic locking
ALTER TABLE public.student_documents 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_student_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_student_documents_updated_at_trigger ON public.student_documents;
CREATE TRIGGER update_student_documents_updated_at_trigger
BEFORE UPDATE ON public.student_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_student_documents_updated_at();

-- Step 2: Fix overdue_submissions view (drop and recreate with correct joins)
DROP VIEW IF EXISTS public.overdue_submissions CASCADE;

CREATE VIEW public.overdue_submissions AS
SELECT
  sd.id,
  sd.source_document_id as document_id,
  d.template_label as title,
  d.original_filename,
  sd.student_id,
  up.full_name as student_name,
  COALESCE(up.roll_number, '') as roll_number,
  d.deadline,
  (CURRENT_DATE - d.deadline) as days_overdue,
  sd.completed_at,
  sd.started_at,
  d.department_scope,
  d.semester_scope
FROM public.student_documents sd
JOIN public.documents d ON sd.source_document_id = d.id
JOIN public.user_profiles up ON sd.student_id = up.id
WHERE d.deadline IS NOT NULL
  AND d.deadline < CURRENT_DATE
  AND sd.completed_at IS NULL
ORDER BY d.deadline ASC;

-- Step 3: Fix upcoming_deadlines view (drop and recreate with correct joins)
DROP VIEW IF EXISTS public.upcoming_deadlines CASCADE;

CREATE VIEW public.upcoming_deadlines AS
SELECT
  sd.id,
  sd.source_document_id as document_id,
  d.template_label as title,
  d.original_filename,
  sd.student_id,
  up.full_name as student_name,
  COALESCE(up.roll_number, '') as roll_number,
  d.deadline,
  (d.deadline - CURRENT_DATE) as days_remaining,
  sd.started_at,
  d.department_scope,
  d.semester_scope
FROM public.student_documents sd
JOIN public.documents d ON sd.source_document_id = d.id
JOIN public.user_profiles up ON sd.student_id = up.id
WHERE d.deadline IS NOT NULL
  AND d.deadline >= CURRENT_DATE
  AND d.deadline <= CURRENT_DATE + INTERVAL '7 days'
  AND sd.completed_at IS NULL
ORDER BY d.deadline ASC;

-- Grant permissions for views
GRANT SELECT ON public.overdue_submissions TO authenticated;
GRANT SELECT ON public.upcoming_deadlines TO authenticated;

-- Add RLS: Faculty can view overdue/upcoming for their own templates
CREATE POLICY "Faculty can view overdue submissions for own templates" ON public.overdue_submissions
  FOR SELECT
  USING (
    source_document_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Faculty can view upcoming deadlines for own templates" ON public.upcoming_deadlines
  FOR SELECT
  USING (
    source_document_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    )
  );

-- Students can view their own items
CREATE POLICY "Students can view own overdue submissions" ON public.overdue_submissions
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can view own upcoming deadlines" ON public.upcoming_deadlines
  FOR SELECT
  USING (student_id = auth.uid());
