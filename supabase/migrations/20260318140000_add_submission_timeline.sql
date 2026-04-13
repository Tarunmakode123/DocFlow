-- Table to track submission status progression
CREATE TABLE submission_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_document_id UUID NOT NULL REFERENCES student_documents(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  previous_status VARCHAR(50),
  changed_by UUID,
  change_reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_submission_status_events_doc ON submission_status_events(student_document_id);
CREATE INDEX idx_submission_status_events_created ON submission_status_events(created_at DESC);
CREATE INDEX idx_submission_status_events_status ON submission_status_events(status);

-- RLS Policies
ALTER TABLE submission_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view status timeline for their submissions"
  ON submission_status_events
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT id FROM student_documents
      WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view status timeline for their templates"
  ON submission_status_events
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT sd.id FROM student_documents sd
      JOIN documents d ON sd.source_document_id = d.id
      WHERE d.created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert status events"
  ON submission_status_events
  FOR INSERT
  WITH CHECK (true);

-- View for status progression summary
CREATE VIEW submission_timeline AS
SELECT
  sd.id as student_document_id,
  sd.student_id,
  sd.source_document_id,
  d.title,
  d.deadline,
  sd.status as current_status,
  sd.started_at,
  sd.completed_at,
  sd.downloaded_at,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', sse.id,
        'status', sse.status,
        'previous_status', sse.previous_status,
        'timestamp', sse.created_at,
        'reason', sse.change_reason
      ) ORDER BY sse.created_at DESC
    ) FROM submission_status_events sse
    WHERE sse.student_document_id = sd.id
  ) as timeline
FROM student_documents sd
JOIN documents d ON sd.source_document_id = d.id;

GRANT SELECT ON submission_timeline TO authenticated;

-- Status sequence definition
CREATE TABLE submission_status_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_key VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color_class VARCHAR(50),
  order_index INT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO submission_status_definitions (status_key, display_name, icon, color_class, order_index, description) VALUES
  ('drafted', 'Drafted', 'FileText', 'bg-gray-100 text-gray-700', 1, 'Form started but not submitted'),
  ('submitted', 'Submitted', 'CheckCircle2', 'bg-blue-100 text-blue-700', 2, 'Form submitted for review'),
  ('under_review', 'Under Review', 'Clock', 'bg-yellow-100 text-yellow-700', 3, 'Faculty reviewing submission'),
  ('changes_requested', 'Changes Requested', 'AlertCircle', 'bg-orange-100 text-orange-700', 4, 'Faculty requested corrections'),
  ('resubmitted', 'Resubmitted', 'RefreshCw', 'bg-purple-100 text-purple-700', 5, 'Student submitted corrections'),
  ('approved', 'Approved', 'CheckCircle2', 'bg-green-100 text-green-700', 6, 'Faculty approved submission'),
  ('rejected', 'Rejected', 'XCircle', 'bg-red-100 text-red-700', 7, 'Faculty rejected submission');

GRANT SELECT ON submission_status_definitions TO authenticated;
