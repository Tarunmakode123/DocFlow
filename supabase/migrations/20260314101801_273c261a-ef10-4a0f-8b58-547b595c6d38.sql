
-- Create storage buckets (policies already exist from previous migration)
INSERT INTO storage.buckets (id, name, public) VALUES ('document-templates', 'document-templates', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-documents', 'generated-documents', false);

-- Service role access for edge functions
CREATE POLICY "Service role full access templates"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'document-templates');

CREATE POLICY "Service role full access generated"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'generated-documents');
