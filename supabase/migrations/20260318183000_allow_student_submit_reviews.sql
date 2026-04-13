-- Allow students to submit completed documents to faculty review queue
-- Students can only create pending review entries for their own submissions.

DROP POLICY IF EXISTS "Students can submit own reviews" ON public.student_document_reviews;

CREATE POLICY "Students can submit own reviews"
ON public.student_document_reviews
FOR INSERT
WITH CHECK (
  review_status = 'pending'
  AND student_document_id IN (
    SELECT id FROM public.student_documents WHERE student_id = auth.uid()
  )
);
