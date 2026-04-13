-- Tier 2: Add correction deadline and improve tracking

-- Add correction_deadline and last_modified_by columns to student_document_corrections
ALTER TABLE public.student_document_corrections
  ADD COLUMN IF NOT EXISTS correction_deadline DATE,
  ADD COLUMN IF NOT EXISTS last_modified_by UUID,
  ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT now();

-- Add index for deadline queries
CREATE INDEX IF NOT EXISTS idx_student_document_corrections_deadline 
  ON public.student_document_corrections(correction_deadline) 
  WHERE status = 'open';

-- Create trigger to update last_modified_at
CREATE OR REPLACE FUNCTION public.update_student_document_corrections_modified_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_modified_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_student_document_corrections_modified_at_trigger ON public.student_document_corrections;
CREATE TRIGGER update_student_document_corrections_modified_at_trigger
BEFORE UPDATE ON public.student_document_corrections
FOR EACH ROW
EXECUTE FUNCTION public.update_student_document_corrections_modified_at();

-- Create view for overdue corrections (deadlines passed, still not resolved)
CREATE OR REPLACE VIEW public.overdue_corrections AS
SELECT
  sdc.id,
  sdc.student_document_id,
  sdc.field_id,
  sd.student_id,
  up.full_name as student_name,
  COALESCE(up.roll_number, '') as roll_number,
  d.template_label as template_name,
  sdc.correction_deadline,
  (CURRENT_DATE - sdc.correction_deadline) as days_overdue,
  sdc.comment,
  sdc.requested_by,
  sdc.requested_at,
  sdc.status
FROM public.student_document_corrections sdc
JOIN public.student_documents sd ON sdc.student_document_id = sd.id
JOIN public.documents d ON sd.source_document_id = d.id
JOIN public.user_profiles up ON sd.student_id = up.id
WHERE sdc.correction_deadline IS NOT NULL
  AND sdc.correction_deadline < CURRENT_DATE
  AND sdc.status = 'open'
ORDER BY sdc.correction_deadline ASC;

GRANT SELECT ON public.overdue_corrections TO authenticated;

-- Create policy for faculty to view overdue corrections for their templates
CREATE POLICY "Faculty can view overdue corrections for own templates" ON public.overdue_corrections
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT sd.id FROM public.student_documents sd
      JOIN public.documents d ON sd.source_document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- Create policy for students to view their own overdue corrections
CREATE POLICY "Students can view own overdue corrections" ON public.overdue_corrections
  FOR SELECT
  USING (student_id = auth.uid());

-- Create view for upcoming correction deadlines (within 7 days)
CREATE OR REPLACE VIEW public.upcoming_correction_deadlines AS
SELECT
  sdc.id,
  sdc.student_document_id,
  sdc.field_id,
  sd.student_id,
  up.full_name as student_name,
  COALESCE(up.roll_number, '') as roll_number,
  d.template_label as template_name,
  sdc.correction_deadline,
  (sdc.correction_deadline - CURRENT_DATE) as days_remaining,
  sdc.comment,
  sdc.requested_by,
  sdc.requested_at,
  sdc.status
FROM public.student_document_corrections sdc
JOIN public.student_documents sd ON sdc.student_document_id = sd.id
JOIN public.documents d ON sd.source_document_id = d.id
JOIN public.user_profiles up ON sd.student_id = up.id
WHERE sdc.correction_deadline IS NOT NULL
  AND sdc.correction_deadline >= CURRENT_DATE
  AND sdc.correction_deadline <= CURRENT_DATE + INTERVAL '7 days'
  AND sdc.status = 'open'
ORDER BY sdc.correction_deadline ASC;

GRANT SELECT ON public.upcoming_correction_deadlines TO authenticated;

-- Create policy for faculty
CREATE POLICY "Faculty can view upcoming correction deadlines for own templates" ON public.upcoming_correction_deadlines
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT sd.id FROM public.student_documents sd
      JOIN public.documents d ON sd.source_document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- Create policy for students
CREATE POLICY "Students can view own upcoming correction deadlines" ON public.upcoming_correction_deadlines
  FOR SELECT
  USING (student_id = auth.uid());
