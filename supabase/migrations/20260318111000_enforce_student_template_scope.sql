DROP POLICY IF EXISTS "Students can view published documents" ON public.documents;

CREATE POLICY "Students can view published documents"
  ON public.documents
  FOR SELECT
  USING (
    is_published = true
    AND (
      department_scope IS NULL
      OR department_scope = 'ALL'
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND up.department IS NOT NULL
          AND lower(up.department) = lower(department_scope)
      )
    )
    AND (
      semester_scope IS NULL
      OR semester_scope = 'ALL'
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND up.semester IS NOT NULL
          AND up.semester = semester_scope
      )
    )
  );

DROP POLICY IF EXISTS "Students can read fields of published docs" ON public.document_fields;

CREATE POLICY "Students can read fields of published docs"
  ON public.document_fields
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.id = document_id
        AND d.is_published = true
        AND (
          d.department_scope IS NULL
          OR d.department_scope = 'ALL'
          OR EXISTS (
            SELECT 1
            FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND up.department IS NOT NULL
              AND lower(up.department) = lower(d.department_scope)
          )
        )
        AND (
          d.semester_scope IS NULL
          OR d.semester_scope = 'ALL'
          OR EXISTS (
            SELECT 1
            FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND up.semester IS NOT NULL
              AND up.semester = d.semester_scope
          )
        )
    )
  );
