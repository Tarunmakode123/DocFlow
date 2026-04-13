-- Communication templates for bulk messaging
CREATE TABLE communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  template_description TEXT,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  template_type VARCHAR(50) NOT NULL DEFAULT 'general', -- 'reminder', 'approved', 'rejected', 'correction', 'general'
  variables TEXT[], -- e.g., ['student_name', 'deadline', 'document_title']
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_communication_templates_created_by ON communication_templates(created_by);
CREATE INDEX idx_communication_templates_type ON communication_templates(template_type);

-- Bulk message campaigns
CREATE TABLE message_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_name VARCHAR(100) NOT NULL,
  template_id UUID NOT NULL REFERENCES communication_templates(id),
  filter_criteria JSONB NOT NULL, -- e.g., {"status": "overdue"}, {"status": ["changes_requested", "pending"]}
  recipient_count INT DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  campaign_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'sent', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_campaigns_created_by ON message_campaigns(created_by);
CREATE INDEX idx_message_campaigns_status ON message_campaigns(campaign_status);

-- Individual message records
CREATE TABLE student_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES message_campaigns(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message_body TEXT NOT NULL,
  message_type VARCHAR(50) NOT NULL, -- 'email', 'in_app', 'both'
  read_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_messages_student_id ON student_messages(student_id);
CREATE INDEX idx_student_messages_campaign_id ON student_messages(campaign_id);
CREATE INDEX idx_student_messages_sent_at ON student_messages(sent_at DESC);

-- RLS Policies
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_messages ENABLE ROW LEVEL SECURITY;

-- Communication templates
CREATE POLICY "Admins can manage their templates"
  ON communication_templates
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Message campaigns
CREATE POLICY "Admins can manage their campaigns"
  ON message_campaigns
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Student messages
CREATE POLICY "Students can view their messages"
  ON student_messages
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admins can insert messages for their campaigns"
  ON student_messages
  FOR INSERT
  WITH CHECK (
    campaign_id IS NULL OR
    campaign_id IN (
      SELECT id FROM message_campaigns WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can view messages for their campaigns"
  ON student_messages
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM message_campaigns WHERE created_by = auth.uid()
    )
  );

-- Default templates
INSERT INTO communication_templates (created_by, template_name, template_description, subject, body, template_type, variables) VALUES
  (
    gen_random_uuid(),
    'Deadline Reminder - 7 Days',
    'Reminder to students when deadline is approaching',
    'Reminder: {{document_title}} due in 7 days',
    'Hi {{student_name}},\n\nThis is a reminder that {{document_title}} is due on {{deadline}}.\n\nPlease complete and submit as soon as possible.\n\nBest regards,\nDocFlow Team',
    'reminder',
    ARRAY['student_name', 'document_title', 'deadline']
  ),
  (
    gen_random_uuid(),
    'Approval Notification',
    'Confirmation that submission was approved',
    '{{document_title}} - Approved',
    'Hi {{student_name}},\n\nYour {{document_title}} submission has been approved!\n\nYou can download your certified copy from the DocFlow system.\n\nBest regards,\nFaculty',
    'approved',
    ARRAY['student_name', 'document_title']
  ),
  (
    gen_random_uuid(),
    'Correction Request',
    'Request for students to make corrections',
    '{{document_title}} - Changes Requested',
    'Hi {{student_name}},\n\nYour {{document_title}} submission requires corrections.\n\nPlease review the requested changes and resubmit within 3 days.\n\nFaculty Comment: {{comment}}\n\nBest regards,\nFaculty',
    'correction',
    ARRAY['student_name', 'document_title', 'comment']
  ),
  (
    gen_random_uuid(),
    'Rejection Notice',
    'Submission was rejected',
    '{{document_title}} - Rejected',
    'Hi {{student_name}},\n\nYour {{document_title}} submission has been rejected.\n\nPlease start over and ensure all required fields are completed accurately.\n\nReason: {{comment}}\n\nBest regards,\nFaculty',
    'rejected',
    ARRAY['student_name', 'document_title', 'comment']
  );
