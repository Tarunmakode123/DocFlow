-- DocFlow COMPLETE Deployment SQL
-- This includes ALL BASELINE migrations + all 9 features
-- Execute this SINGLE FILE in Supabase SQL Editor
-- This will initialize the entire database from scratch

-- ============================================================================
-- BASELINE MIGRATION 1: Core tables (documents, fields, responses, etc)
-- Original: 20260314095439_c6129037-56ed-4771-b15b-2aa44ca9fde9.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL DEFAULT '',
  total_pages INTEGER,
  status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading','analyzing','in_progress','completed','error')),
  pages_completed INTEGER DEFAULT 0,
  is_template BOOLEAN DEFAULT false,
  template_name TEXT,
  shared_link_id UUID UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  field_id TEXT NOT NULL,
  global_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  order_index INTEGER,
  category TEXT,
  detect_hint TEXT,
  select_options JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.field_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  field_id TEXT NOT NULL,
  global_key TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, field_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.analysis_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number INTEGER,
  raw_response TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  uses INTEGER DEFAULT 0,
  max_uses INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','institution')),
  docs_used_this_month INTEGER DEFAULT 0,
  razorpay_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view fields of own docs" ON public.document_fields FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid()));
CREATE POLICY "Users can insert fields for own docs" ON public.document_fields FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid()));

CREATE POLICY "Users can view own responses" ON public.field_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own responses" ON public.field_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own responses" ON public.field_responses FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own errors" ON public.analysis_errors FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid()));
CREATE POLICY "Users can insert errors for own docs" ON public.analysis_errors FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid()));

CREATE POLICY "Users can manage own share links" ON public.share_links FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Anyone can view share links by id" ON public.share_links FOR SELECT USING (true);

CREATE POLICY "Users can view own subscription" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_field_responses_updated_at ON public.field_responses;
CREATE TRIGGER update_field_responses_updated_at BEFORE UPDATE ON public.field_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan, docs_used_this_month)
  VALUES (NEW.id, 'free', 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- ============================================================================
-- BASELINE MIGRATION 2: Storage buckets
-- Original: 20260314095552_5feeadcc-e294-480c-a449-0c4dd90ac81d.sql
-- ============================================================================

CREATE POLICY "Users can upload own templates" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'document-templates' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own templates" ON storage.objects FOR SELECT USING (bucket_id = 'document-templates' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own generated docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'generated-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own generated docs" ON storage.objects FOR SELECT USING (bucket_id = 'generated-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- BASELINE MIGRATION 3: Storage buckets (for templates and generated docs)
-- Original: 20260314101801_273c261a-ef10-4a0f-8b58-547b595c6d38.sql
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('document-templates', 'document-templates', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-documents', 'generated-documents', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Service role full access templates" ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'document-templates');

CREATE POLICY "Service role full access generated" ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'generated-documents');

-- ============================================================================
-- BASELINE MIGRATION 4: Enhanced documents + user_profiles + cached_analysis
-- Original: 20260317081630_eb306fe3-bda6-46be-8350-5ec23eca6ee6.sql
-- ============================================================================

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS uploaded_by_role TEXT DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS template_label TEXT,
  ADD COLUMN IF NOT EXISTS template_description TEXT,
  ADD COLUMN IF NOT EXISTS department_scope TEXT,
  ADD COLUMN IF NOT EXISTS semester_scope TEXT,
  ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  full_name TEXT,
  college_name TEXT,
  department TEXT,
  roll_number TEXT,
  enrollment_number TEXT,
  sap_id TEXT,
  division TEXT,
  class TEXT,
  semester TEXT,
  academic_year TEXT,
  university_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (id = auth.uid());

CREATE TABLE IF NOT EXISTS public.cached_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  fields_json JSONB NOT NULL,
  raw_page_text TEXT,
  analysis_status TEXT DEFAULT 'success' CHECK (analysis_status IN ('success', 'failed', 'manual_fallback')),
  error_message TEXT,
  claude_model TEXT,
  tokens_used INTEGER,
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, page_number)
);

ALTER TABLE public.cached_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage analysis for own docs" ON public.cached_analysis FOR ALL
  USING (document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));
CREATE POLICY "Students can read analysis for published docs" ON public.cached_analysis FOR SELECT
  USING (document_id IN (SELECT id FROM public.documents WHERE is_published = true));

CREATE TABLE IF NOT EXISTS public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  source_document_id UUID REFERENCES public.documents ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'downloaded')),
  pages_completed INTEGER DEFAULT 0,
  generated_file_path TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  UNIQUE(student_id, source_document_id)
);

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own documents" ON public.student_documents FOR ALL
  USING (student_id = auth.uid());
CREATE POLICY "Admins can view usage of their templates" ON public.student_documents FOR SELECT
  USING (source_document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));

ALTER TABLE public.field_responses
  ADD COLUMN IF NOT EXISTS student_document_id UUID REFERENCES public.student_documents ON DELETE CASCADE;

CREATE POLICY "Students can view published documents" ON public.documents FOR SELECT
  USING (is_published = true);
CREATE POLICY "Students can read fields of published docs" ON public.document_fields FOR SELECT
  USING (document_id IN (SELECT id FROM public.documents WHERE is_published = true));

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- ============================================================================
-- BASELINE MIGRATION 5: Template overrides
-- Original: 20260317095147_0c226000-eca3-40ac-b3a4-d0b23ce70cae.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.template_overrides (
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
CREATE POLICY "Students manage own overrides" ON public.template_overrides FOR ALL
  USING (student_document_id IN (
    SELECT id FROM public.student_documents WHERE student_id = auth.uid()
  ));

-- ============================================================================
-- BASELINE MIGRATION 6: Storage bucket for student uploads
-- Original: 20260317095818_45952614-cc00-4443-b02c-22e83fb2a3f5.sql
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('student-uploads', 'student-uploads', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Students upload own images" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'student-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Students read own images" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'student-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Students update own images" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'student-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Students delete own images" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'student-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Service role reads all uploads" ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'student-uploads');

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

CREATE POLICY "Students can view own submission reviews" ON public.student_document_reviews FOR SELECT
  USING (student_document_id IN (SELECT id FROM public.student_documents WHERE student_id = auth.uid()));

CREATE POLICY "Admins can view reviews for own templates" ON public.student_document_reviews FOR SELECT
  USING (student_document_id IN (
    SELECT sd.id FROM public.student_documents sd
    JOIN public.documents d ON d.id = sd.source_document_id
    WHERE d.user_id = auth.uid()
  ));

CREATE POLICY "Admins can create reviews for own templates" ON public.student_document_reviews FOR INSERT
  WITH CHECK (student_document_id IN (
    SELECT sd.id FROM public.student_documents sd
    JOIN public.documents d ON d.id = sd.source_document_id
    WHERE d.user_id = auth.uid()
  ));

CREATE POLICY "Admins can update reviews for own templates" ON public.student_document_reviews FOR UPDATE
  USING (student_document_id IN (
    SELECT sd.id FROM public.student_documents sd
    JOIN public.documents d ON d.id = sd.source_document_id
    WHERE d.user_id = auth.uid()
  ))
  WITH CHECK (student_document_id IN (
    SELECT sd.id FROM public.student_documents sd
    JOIN public.documents d ON d.id = sd.source_document_id
    WHERE d.user_id = auth.uid()
  ));

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

CREATE INDEX IF NOT EXISTS idx_student_document_review_events_doc_id ON public.student_document_review_events(student_document_id);
CREATE INDEX IF NOT EXISTS idx_student_document_review_events_created ON public.student_document_review_events(created_at DESC);

ALTER TABLE public.student_document_review_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view events for own submissions" ON public.student_document_review_events FOR SELECT
  USING (student_document_id IN (SELECT id FROM public.student_documents WHERE student_id = auth.uid()));

CREATE POLICY "Admins can view events for own template submissions" ON public.student_document_review_events FOR SELECT
  USING (student_document_id IN (
    SELECT sd.id FROM public.student_documents sd
    JOIN public.documents d ON sd.source_document_id = d.id
    WHERE d.user_id = auth.uid()
  ));

CREATE POLICY "System can insert review events" ON public.student_document_review_events FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- FEATURE 4: TEMPLATE VERSIONING
-- Migration: 20260318121000_add_template_versions.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  notes VARCHAR(500),
  snapshot JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_template_versions_doc_id ON public.template_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_created ON public.template_versions(created_at DESC);

ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage versions for own templates" ON public.template_versions FOR SELECT
  USING (document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));

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

CREATE INDEX IF NOT EXISTS idx_student_document_corrections_doc ON public.student_document_corrections(student_document_id);
CREATE INDEX IF NOT EXISTS idx_student_document_corrections_status ON public.student_document_corrections(status);

ALTER TABLE public.student_document_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view corrections for own submissions" ON public.student_document_corrections FOR SELECT
  USING (student_document_id IN (SELECT id FROM public.student_documents WHERE student_id = auth.uid()));

CREATE POLICY "Admins can view corrections for own template submissions" ON public.student_document_corrections FOR SELECT
  USING (student_document_id IN (
    SELECT sd.id FROM public.student_documents sd
    JOIN public.documents d ON sd.source_document_id = d.id
    WHERE d.user_id = auth.uid()
  ));

CREATE POLICY "Admins can request corrections" ON public.student_document_corrections FOR INSERT
  WITH CHECK (student_document_id IN (
    SELECT sd.id FROM public.student_documents sd
    JOIN public.documents d ON sd.source_document_id = d.id
    WHERE d.user_id = auth.uid()
  ));

CREATE POLICY "Students can resolve corrections" ON public.student_document_corrections FOR UPDATE
  USING (student_document_id IN (SELECT id FROM public.student_documents WHERE student_id = auth.uid()))
  WITH CHECK (student_document_id IN (SELECT id FROM public.student_documents WHERE student_id = auth.uid()));

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

CREATE INDEX IF NOT EXISTS idx_submission_reminders_document ON public.submission_reminders(student_document_id);
CREATE INDEX IF NOT EXISTS idx_submission_reminders_sent ON public.submission_reminders(sent_at);

ALTER TABLE public.submission_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view reminders for their submissions" ON public.submission_reminders FOR SELECT
  USING (student_document_id IN (SELECT id FROM public.student_documents WHERE student_id = auth.uid()));

CREATE POLICY "Admins can view reminders for their templates" ON public.submission_reminders FOR SELECT
  USING (student_document_id IN (
    SELECT sd.id FROM public.student_documents sd
    JOIN public.documents d ON sd.source_document_id = d.id
    WHERE d.user_id = auth.uid()
  ));

CREATE POLICY "System can insert reminders" ON public.submission_reminders FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE VIEW public.overdue_submissions AS
SELECT
  sd.id,
  sd.source_document_id as document_id,
  d.template_label as title,
  sd.student_id,
  up.full_name as student_name,
  d.deadline,
  CURRENT_DATE - d.deadline as days_overdue,
  sd.completed_at
FROM public.student_documents sd
JOIN public.documents d ON sd.source_document_id = d.id
JOIN public.user_profiles up ON sd.student_id = up.id
WHERE d.deadline IS NOT NULL
  AND d.deadline < CURRENT_DATE
  AND sd.completed_at IS NULL;

CREATE OR REPLACE VIEW public.upcoming_deadlines AS
SELECT
  sd.id,
  sd.source_document_id as document_id,
  d.template_label as title,
  sd.student_id,
  up.full_name as student_name,
  d.deadline,
  d.deadline - CURRENT_DATE as days_remaining,
  sd.started_at
FROM public.student_documents sd
JOIN public.documents d ON sd.source_document_id = d.id
JOIN public.user_profiles up ON sd.student_id = up.id
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

CREATE INDEX IF NOT EXISTS idx_submission_status_events_doc ON public.submission_status_events(student_document_id);
CREATE INDEX IF NOT EXISTS idx_submission_status_events_created ON public.submission_status_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submission_status_events_status ON public.submission_status_events(status);

ALTER TABLE public.submission_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view status timeline for their submissions" ON public.submission_status_events FOR SELECT
  USING (student_document_id IN (SELECT id FROM public.student_documents WHERE student_id = auth.uid()));

CREATE POLICY "Admins can view status timeline for their templates" ON public.submission_status_events FOR SELECT
  USING (student_document_id IN (
    SELECT sd.id FROM public.student_documents sd
    JOIN public.documents d ON sd.source_document_id = d.id
    WHERE d.user_id = auth.uid()
  ));

CREATE POLICY "System can insert status events" ON public.submission_status_events FOR INSERT
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
  ('rejected', 'Rejected', 'XCircle', 'bg-red-100 text-red-700', 7, 'Faculty rejected submission')
ON CONFLICT DO NOTHING;

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

CREATE INDEX IF NOT EXISTS idx_communication_templates_created_by ON public.communication_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_communication_templates_type ON public.communication_templates(template_type);

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

CREATE INDEX IF NOT EXISTS idx_message_campaigns_created_by ON public.message_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_message_campaigns_status ON public.message_campaigns(campaign_status);

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

CREATE INDEX IF NOT EXISTS idx_student_messages_student_id ON public.student_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_student_messages_campaign_id ON public.student_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_student_messages_sent_at ON public.student_messages(sent_at DESC);

ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their templates" ON public.communication_templates FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage their campaigns" ON public.message_campaigns FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Students can view their messages" ON public.student_messages FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admins can insert messages for their campaigns" ON public.student_messages FOR INSERT
  WITH CHECK (
    campaign_id IS NULL OR
    campaign_id IN (
      SELECT id FROM public.message_campaigns WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can view messages for their campaigns" ON public.student_messages FOR SELECT
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
    'Hi {{student_name}},

This is a reminder that {{document_title}} is due on {{deadline}}.

Please complete and submit as soon as possible.

Best regards,
DocFlow Team',
    'reminder',
    ARRAY['student_name', 'document_title', 'deadline']
  ),
  (
    'Approval Notification',
    'Confirmation that submission was approved',
    '{{document_title}} - Approved',
    'Hi {{student_name}},

Your {{document_title}} submission has been approved!

You can download your certified copy from the DocFlow system.

Best regards,
Faculty',
    'approved',
    ARRAY['student_name', 'document_title']
  ),
  (
    'Correction Request',
    'Request for students to make corrections',
    '{{document_title}} - Changes Requested',
    'Hi {{student_name}},

Your {{document_title}} submission requires corrections.

Please review the requested changes and resubmit within 3 days.

Faculty Comment: {{comment}}

Best regards,
Faculty',
    'correction',
    ARRAY['student_name', 'document_title', 'comment']
  ),
  (
    'Rejection Notice',
    'Submission was rejected',
    '{{document_title}} - Rejected',
    'Hi {{student_name}},

Your {{document_title}} submission has been rejected.

Please start over and ensure all required fields are completed accurately.

Reason: {{comment}}

Best regards,
Faculty',
    'rejected',
    ARRAY['student_name', 'document_title', 'comment']
  )
) AS t(template_name, template_description, subject, body, template_type, variables)
WHERE (SELECT COUNT(*) FROM auth.users) > 0
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- All baseline migrations + 9 features have been deployed to the database
-- ============================================================================
