-- Add deadline support to documents
ALTER TABLE documents ADD COLUMN deadline DATE NULL;
ALTER TABLE documents ADD COLUMN reminder_days INTEGER[] DEFAULT ARRAY[7, 3, 1];

-- Table to track which reminders have been sent
CREATE TABLE submission_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_document_id UUID NOT NULL REFERENCES student_documents(id) ON DELETE CASCADE,
  days_before INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for efficient reminder lookups
CREATE INDEX idx_submission_reminders_document ON submission_reminders(student_document_id);
CREATE INDEX idx_submission_reminders_sent ON submission_reminders(sent_at);

-- RLS Policies for submission_reminders
ALTER TABLE submission_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view reminders for their submissions"
  ON submission_reminders
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT id FROM student_documents
      WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view reminders for their templates"
  ON submission_reminders
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT sd.id FROM student_documents sd
      JOIN documents d ON sd.document_id = d.id
      WHERE d.created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert reminders"
  ON submission_reminders
  FOR INSERT
  WITH CHECK (true);

-- Add deadline views for analytics
CREATE VIEW overdue_submissions AS
SELECT
  sd.id,
  sd.document_id,
  d.title,
  sd.student_id,
  up.email as student_email,
  d.deadline,
  CURRENT_DATE - d.deadline as days_overdue,
  sd.completed_at
FROM student_documents sd
JOIN documents d ON sd.document_id = d.id
JOIN user_profiles up ON sd.student_id = up.user_id
WHERE d.deadline IS NOT NULL
  AND d.deadline < CURRENT_DATE
  AND sd.completed_at IS NULL;

CREATE VIEW upcoming_deadlines AS
SELECT
  sd.id,
  sd.document_id,
  d.title,
  sd.student_id,
  up.email as student_email,
  d.deadline,
  d.deadline - CURRENT_DATE as days_remaining,
  sd.started_at
FROM student_documents sd
JOIN documents d ON sd.document_id = d.id
JOIN user_profiles up ON sd.student_id = up.user_id
WHERE d.deadline IS NOT NULL
  AND d.deadline >= CURRENT_DATE
  AND d.deadline <= CURRENT_DATE + INTERVAL '7 days'
  AND sd.completed_at IS NULL;

-- Grants for views
GRANT SELECT ON overdue_submissions TO authenticated;
GRANT SELECT ON upcoming_deadlines TO authenticated;
