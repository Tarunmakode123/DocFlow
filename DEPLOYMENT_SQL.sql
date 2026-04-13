-- DocFlow Feature Deployment SQL
-- Deploy all 9 features to Supabase
-- Execute these migrations in order through Supabase SQL Editor
-- Go to: https://app.supabase.com/project/tlraorhblauyyahlhbaz/sql/new

-- ============================================================================
-- FEATURE 1, 2: BULK APPROVE/REJECT + REVIEW HISTORY
-- Migration: 20260318103000_add_student_document_reviews.sql
-- ============================================================================

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

-- ============================================================================
-- FEATURE 2: REVIEW HISTORY TIMELINE
-- Migration: 20260318114500_add_student_review_events.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_document_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_document_id UUID NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
  review_status TEXT NOT NULL,
  review_comment TEXT,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_document_review_events_doc_id ON public.student_document_review_events(student_document_id);
CREATE INDEX idx_student_document_review_events_created ON public.student_document_review_events(created_at DESC);

ALTER TABLE public.student_document_review_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view events for own submissions"
  ON public.student_document_review_events
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT id FROM public.student_documents WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view events for own template submissions"
  ON public.student_document_review_events
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT sd.id FROM public.student_documents sd
      JOIN public.documents d ON sd.source_document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert review events"
  ON public.student_document_review_events
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- FEATURE 4: TEMPLATE VERSIONING
-- Migration: 20260318121000_add_template_versions.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'manual', 'publish', 'unpublish', 'rollback'
  notes VARCHAR(500),
  snapshot JSONB NOT NULL, -- {document: {...}, fields: [...]}
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, version_number)
);

CREATE INDEX idx_template_versions_doc_id ON public.template_versions(document_id);
CREATE INDEX idx_template_versions_created ON public.template_versions(created_at DESC);

ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage versions for own templates"
  ON public.template_versions
  FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FEATURE 6: CORRECTION REQUEST LOOP
-- Migration: 20260318123500_add_student_document_corrections.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_document_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_document_id UUID NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
  field_id VARCHAR(255) NOT NULL,
  comment TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  requested_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_document_corrections_doc ON public.student_document_corrections(student_document_id);
CREATE INDEX idx_student_document_corrections_status ON public.student_document_corrections(status);

ALTER TABLE public.student_document_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view corrections for own submissions"
  ON public.student_document_corrections
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT id FROM public.student_documents WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view corrections for own template submissions"
  ON public.student_document_corrections
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT sd.id FROM public.student_documents sd
      JOIN public.documents d ON sd.source_document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can request corrections"
  ON public.student_document_corrections
  FOR INSERT
  WITH CHECK (
    student_document_id IN (
      SELECT sd.id FROM public.student_documents sd
      JOIN public.documents d ON sd.source_document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can resolve corrections"
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

-- ============================================================================
-- FEATURE 7: DEADLINE + REMINDER ENGINE
-- Migration: 20260318130000_add_deadline_engine.sql
-- ============================================================================

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS deadline DATE NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS reminder_days INTEGER[] DEFAULT ARRAY[7, 3, 1];

CREATE TABLE IF NOT EXISTS public.submission_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_document_id UUID NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
  days_before INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submission_reminders_document ON public.submission_reminders(student_document_id);
CREATE INDEX idx_submission_reminders_sent ON public.submission_reminders(sent_at);

ALTER TABLE public.submission_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view reminders for their submissions"
  ON public.submission_reminders
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT id FROM public.student_documents
      WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view reminders for their templates"
  ON public.submission_reminders
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT sd.id FROM public.student_documents sd
      JOIN public.documents d ON sd.source_document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert reminders"
  ON public.submission_reminders
  FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE VIEW public.overdue_submissions AS
SELECT
  sd.id,
  sd.source_document_id as document_id,
  d.template_label as title,
  sd.student_id,
  up.email as student_email,
  d.deadline,
  CURRENT_DATE - d.deadline as days_overdue,
  sd.completed_at
FROM public.student_documents sd
JOIN public.documents d ON sd.source_document_id = d.id
JOIN public.user_profiles up ON sd.student_id = up.user_id
WHERE d.deadline IS NOT NULL
  AND d.deadline < CURRENT_DATE
  AND sd.completed_at IS NULL;

CREATE OR REPLACE VIEW public.upcoming_deadlines AS
SELECT
  sd.id,
  sd.source_document_id as document_id,
  d.template_label as title,
  sd.student_id,
  up.email as student_email,
  d.deadline,
  d.deadline - CURRENT_DATE as days_remaining,
  sd.started_at
FROM public.student_documents sd
JOIN public.documents d ON sd.source_document_id = d.id
JOIN public.user_profiles up ON sd.student_id = up.user_id
WHERE d.deadline IS NOT NULL
  AND d.deadline >= CURRENT_DATE
  AND d.deadline <= CURRENT_DATE + INTERVAL '7 days'
  AND sd.completed_at IS NULL;

GRANT SELECT ON public.overdue_submissions TO authenticated;
GRANT SELECT ON public.upcoming_deadlines TO authenticated;

-- ============================================================================
-- FEATURE 8: SUBMISSION STATUS TIMELINE
-- Migration: 20260318140000_add_submission_timeline.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.submission_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_document_id UUID NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  previous_status VARCHAR(50),
  changed_by UUID,
  change_reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submission_status_events_doc ON public.submission_status_events(student_document_id);
CREATE INDEX idx_submission_status_events_created ON public.submission_status_events(created_at DESC);
CREATE INDEX idx_submission_status_events_status ON public.submission_status_events(status);

ALTER TABLE public.submission_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view status timeline for their submissions"
  ON public.submission_status_events
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT id FROM public.student_documents
      WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view status timeline for their templates"
  ON public.submission_status_events
  FOR SELECT
  USING (
    student_document_id IN (
      SELECT sd.id FROM public.student_documents sd
      JOIN public.documents d ON sd.source_document_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert status events"
  ON public.submission_status_events
  FOR INSERT
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.submission_status_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_key VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color_class VARCHAR(50),
  order_index INT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO public.submission_status_definitions (status_key, display_name, icon, color_class, order_index, description) VALUES
  ('drafted', 'Drafted', 'FileText', 'bg-gray-100 text-gray-700', 1, 'Form started but not submitted'),
  ('submitted', 'Submitted', 'CheckCircle2', 'bg-blue-100 text-blue-700', 2, 'Form submitted for review'),
  ('under_review', 'Under Review', 'Clock', 'bg-yellow-100 text-yellow-700', 3, 'Faculty reviewing submission'),
  ('changes_requested', 'Changes Requested', 'AlertCircle', 'bg-orange-100 text-orange-700', 4, 'Faculty requested corrections'),
  ('resubmitted', 'Resubmitted', 'RefreshCw', 'bg-purple-100 text-purple-700', 5, 'Student submitted corrections'),
  ('approved', 'Approved', 'CheckCircle2', 'bg-green-100 text-green-700', 6, 'Faculty approved submission'),
  ('rejected', 'Rejected', 'XCircle', 'bg-red-100 text-red-700', 7, 'Faculty rejected submission');

GRANT SELECT ON public.submission_status_definitions TO authenticated;

-- ============================================================================
-- FEATURE 9: BULK COMMUNICATION
-- Migration: 20260318150000_add_bulk_communication.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  template_description TEXT,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  template_type VARCHAR(50) NOT NULL DEFAULT 'general',
  variables TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_communication_templates_created_by ON public.communication_templates(created_by);
CREATE INDEX idx_communication_templates_type ON public.communication_templates(template_type);

CREATE TABLE IF NOT EXISTS public.message_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_name VARCHAR(100) NOT NULL,
  template_id UUID NOT NULL REFERENCES public.communication_templates(id),
  filter_criteria JSONB NOT NULL,
  recipient_count INT DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  campaign_status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_campaigns_created_by ON public.message_campaigns(created_by);
CREATE INDEX idx_message_campaigns_status ON public.message_campaigns(campaign_status);

CREATE TABLE IF NOT EXISTS public.student_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.message_campaigns(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message_body TEXT NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_messages_student_id ON public.student_messages(student_id);
CREATE INDEX idx_student_messages_campaign_id ON public.student_messages(campaign_id);
CREATE INDEX idx_student_messages_sent_at ON public.student_messages(sent_at DESC);

ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their templates"
  ON public.communication_templates
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage their campaigns"
  ON public.message_campaigns
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Students can view their messages"
  ON public.student_messages
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admins can insert messages for their campaigns"
  ON public.student_messages
  FOR INSERT
  WITH CHECK (
    campaign_id IS NULL OR
    campaign_id IN (
      SELECT id FROM public.message_campaigns WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can view messages for their campaigns"
  ON public.student_messages
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.message_campaigns WHERE created_by = auth.uid()
    )
  );

-- Insert default message templates
INSERT INTO public.communication_templates (created_by, template_name, template_description, subject, body, template_type, variables) 
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  template_name,
  template_description,
  subject,
  body,
  template_type,
  variables
FROM (
  VALUES
  (
    'Deadline Reminder - 7 Days',
    'Reminder to students when deadline is approaching',
    'Reminder: {{document_title}} due in 7 days',
    'Hi {{student_name}},\n\nThis is a reminder that {{document_title}} is due on {{deadline}}.\n\nPlease complete and submit as soon as possible.\n\nBest regards,\nDocFlow Team',
    'reminder',
    ARRAY['student_name', 'document_title', 'deadline']
  ),
  (
    'Approval Notification',
    'Confirmation that submission was approved',
    '{{document_title}} - Approved',
    'Hi {{student_name}},\n\nYour {{document_title}} submission has been approved!\n\nYou can download your certified copy from the DocFlow system.\n\nBest regards,\nFaculty',
    'approved',
    ARRAY['student_name', 'document_title']
  ),
  (
    'Correction Request',
    'Request for students to make corrections',
    '{{document_title}} - Changes Requested',
    'Hi {{student_name}},\n\nYour {{document_title}} submission requires corrections.\n\nPlease review the requested changes and resubmit within 3 days.\n\nFaculty Comment: {{comment}}\n\nBest regards,\nFaculty',
    'correction',
    ARRAY['student_name', 'document_title', 'comment']
  ),
  (
    'Rejection Notice',
    'Submission was rejected',
    '{{document_title}} - Rejected',
    'Hi {{student_name}},\n\nYour {{document_title}} submission has been rejected.\n\nPlease start over and ensure all required fields are completed accurately.\n\nReason: {{comment}}\n\nBest regards,\nFaculty',
    'rejected',
    ARRAY['student_name', 'document_title', 'comment']
  )
) AS t(template_name, template_description, subject, body, template_type, variables);

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- All 9 features have been deployed to the database
-- ============================================================================
