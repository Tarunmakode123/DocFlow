
-- 1. Alter documents table FIRST (needed by RLS policies below)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS uploaded_by_role TEXT DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS template_label TEXT,
  ADD COLUMN IF NOT EXISTS template_description TEXT,
  ADD COLUMN IF NOT EXISTS department_scope TEXT,
  ADD COLUMN IF NOT EXISTS semester_scope TEXT,
  ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- 2. user_profiles table
CREATE TABLE public.user_profiles (
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

-- 3. cached_analysis table
CREATE TABLE public.cached_analysis (
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

-- 4. student_documents table
CREATE TABLE public.student_documents (
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

-- 5. Alter field_responses
ALTER TABLE public.field_responses
  ADD COLUMN IF NOT EXISTS student_document_id UUID REFERENCES public.student_documents ON DELETE CASCADE;

-- 6. Additional RLS policies
CREATE POLICY "Students can view published documents" ON public.documents FOR SELECT
  USING (is_published = true);
CREATE POLICY "Students can read fields of published docs" ON public.document_fields FOR SELECT
  USING (document_id IN (SELECT id FROM public.documents WHERE is_published = true));

-- 7. Auto-create profile on signup
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
