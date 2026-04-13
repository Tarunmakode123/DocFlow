import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Loader2, Sparkles, Eye, RefreshCw, AlertTriangle } from "lucide-react";
import ImageUploadField from "@/components/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";


interface DocumentField {
  id: string;
  field_id: string;
  global_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  page_number: number;
  category: string | null;
  detect_hint: string | null;
  order_index: number | null;
  min_length?: number | null;
  max_length?: number | null;
  validation_pattern?: string | null;
  validation_message?: string | null;
  select_options?: unknown;
}

type CorrectionRequest = {
  id: string;
  field_id: string;
  comment: string | null;
  status: "open" | "resolved";
};

const profileToGlobalKeyMap: Record<string, string> = {
  full_name: "student_name",
  roll_number: "roll_number",
  enrollment_number: "enrollment_number",
  sap_id: "sap_id",
  department: "department",
  division: "division",
  class: "class",
  semester: "semester",
  academic_year: "academic_year",
  college_name: "college_name",
  university_name: "university_name",
};

const getSelectOptions = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
};

const canAccessTemplate = (
  template: { department_scope?: string | null; semester_scope?: string | null } | null | undefined,
  profile: { department?: string | null; semester?: string | null } | null | undefined
) => {
  if (!template) return false;
  const normalize = (value?: string | null) => (value || "").trim().toUpperCase();
  const deptScope = normalize(template.department_scope);
  const semScope = normalize(template.semester_scope);
  const deptValue = normalize(profile?.department);
  const semValue = normalize(profile?.semester);

  const deptOk =
    !deptScope ||
    deptScope === "ALL" ||
    !deptValue ||
    deptScope === deptValue;
  const semOk =
    !semScope ||
    semScope === "ALL" ||
    !semValue ||
    semScope === semValue;
  return deptOk && semOk;
};

const validateFieldValue = (field: DocumentField, value: string): string | null => {
  const trimmed = value.trim();

  if (field.is_required && !trimmed) {
    return field.validation_message || `${field.label} is required.`;
  }

  if (!trimmed) return null;

  if (typeof field.min_length === "number" && trimmed.length < field.min_length) {
    return field.validation_message || `${field.label} must be at least ${field.min_length} characters.`;
  }

  if (typeof field.max_length === "number" && trimmed.length > field.max_length) {
    return field.validation_message || `${field.label} must be at most ${field.max_length} characters.`;
  }

  if (field.validation_pattern) {
    try {
      const pattern = new RegExp(field.validation_pattern);
      if (!pattern.test(trimmed)) {
        return field.validation_message || `${field.label} format is invalid.`;
      }
    } catch {
      // If admin enters invalid regex, skip runtime blocking for students.
    }
  }

  if (field.field_type === "select") {
    const options = getSelectOptions(field.select_options);
    if (options.length > 0 && !options.includes(trimmed)) {
      return field.validation_message || `${field.label} must match one of the allowed options.`;
    }
  }

  return null;
};

export default function StudentFillTemplate() {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const fromPreview = searchParams.get("fromPreview") === "true";
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [fields, setFields] = useState<DocumentField[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentDocId, setStudentDocId] = useState<string | null>(null);
  const [docInfo, setDocInfo] = useState<any>(null);
  const [openCorrections, setOpenCorrections] = useState<CorrectionRequest[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!templateId || !user) return;

    const loadData = async () => {
      // Load template info, fields, and existing student doc in parallel
      const [docRes, fieldsRes] = await Promise.all([
        supabase.from("documents").select("*").eq("id", templateId).single(),
        supabase.from("document_fields").select("*").eq("document_id", templateId).order("page_number").order("order_index"),
      ]);

      if (docRes.data) {
        if (!canAccessTemplate(docRes.data as any, profile)) {
          toast({
            title: "Template access restricted",
            description: "This template is not available for your department or semester.",
            variant: "destructive",
          });
          navigate("/student/fill", { replace: true });
          return;
        }
        setDocInfo(docRes.data);
        setTotalPages(docRes.data.total_pages || 1);
      }

      if (fieldsRes.data) {
        setFields(fieldsRes.data as DocumentField[]);
        if (!docRes.data?.total_pages) {
          setTotalPages(Math.max(...fieldsRes.data.map((f: any) => f.page_number), 1));
        }
      }

      // Get or create student_document
      const { data: existingSD } = await supabase
        .from("student_documents" as any)
        .select("*")
        .eq("student_id", user.id)
        .eq("source_document_id", templateId)
        .single();

      let sdId: string;
      const sd = existingSD as any;
      if (sd) {
        sdId = sd.id;
      } else {
        const { data: newSD } = await supabase
          .from("student_documents" as any)
          .insert({ student_id: user.id, source_document_id: templateId })
          .select()
          .single();
        sdId = (newSD as any)?.id;
      }
      setStudentDocId(sdId);

      const { data: correctionRows } = await supabase
        .from("student_document_corrections" as any)
        .select("id, field_id, comment, status")
        .eq("student_document_id", sdId)
        .eq("status", "open");

      const openCorrectionRows = (((correctionRows || []) as unknown) as CorrectionRequest[]);
      setOpenCorrections(openCorrectionRows);

      // If already completed/downloaded and coming fresh, allow re-entry only when corrections are pending.
      if (sd && (sd.status === "completed" || sd.status === "downloaded") && !fromPreview && openCorrectionRows.length === 0) {
        navigate(`/student/preview/${templateId}`, { replace: true });
        return;
      }

      // Load existing responses
      const { data: existingResponses } = await supabase
        .from("field_responses")
        .select("*")
        .eq("document_id", templateId)
        .eq("user_id", user.id);

      const resMap: Record<string, string> = {};
      if (existingResponses) {
        existingResponses.forEach((r: any) => { resMap[r.field_id] = r.value || ""; });
      }

      // Auto-fill from profile
      const autoFilledSet = new Set<string>();
      if (profile && fieldsRes.data) {
        const profileData: Record<string, string> = {};
        Object.entries(profileToGlobalKeyMap).forEach(([profileKey, globalKey]) => {
          const val = (profile as any)[profileKey];
          if (val) profileData[globalKey] = val;
        });

        fieldsRes.data.forEach((f: any) => {
          if (!resMap[f.field_id] && profileData[f.global_key]) {
            resMap[f.field_id] = profileData[f.global_key];
            autoFilledSet.add(f.field_id);
          }
        });
      }

      setResponses(resMap);
      setAutoFilled(autoFilledSet);
      const initialErrors: Record<string, string> = {};
      (fieldsRes.data || []).forEach((f: any) => {
        const msg = validateFieldValue(f as DocumentField, resMap[f.field_id] || "");
        if (msg) initialErrors[f.field_id] = msg;
      });
      setFieldErrors(initialErrors);
      setLoading(false);

      if (Object.keys(resMap).length > 0 || autoFilledSet.size > 0) {
        toast({
          title: "Template loaded",
          description: `${fieldsRes.data?.length || 0} fields across ${docRes.data?.total_pages || 0} pages${autoFilledSet.size > 0 ? ` · ${autoFilledSet.size} auto-filled from profile` : ""}`,
        });
      }
    };

    loadData();
  }, [templateId, user, profile, navigate, toast]);

  const currentFields = useMemo(
    () => fields.filter((f) => f.page_number === currentPage),
    [fields, currentPage]
  );

  const globalFieldMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    fields.forEach((f) => {
      if (!map[f.global_key]) map[f.global_key] = [];
      map[f.global_key].push(f.field_id);
    });
    return map;
  }, [fields]);

  const fieldById = useMemo(() => {
    const map: Record<string, DocumentField> = {};
    fields.forEach((f) => {
      map[f.field_id] = f;
    });
    return map;
  }, [fields]);

  const computedErrors = useMemo(() => {
    const next: Record<string, string> = {};
    fields.forEach((field) => {
      const msg = validateFieldValue(field, responses[field.field_id] || "");
      if (msg) next[field.field_id] = msg;
    });
    return next;
  }, [fields, responses]);

  const errorSummaryByPage = useMemo(() => {
    const map: Record<number, Array<{ fieldId: string; label: string; message: string }>> = {};
    fields.forEach((field) => {
      const msg = computedErrors[field.field_id];
      if (!msg) return;
      if (!map[field.page_number]) map[field.page_number] = [];
      map[field.page_number].push({ fieldId: field.field_id, label: field.label, message: msg });
    });
    return map;
  }, [fields, computedErrors]);

  const deadlineInfo = useMemo(() => {
    if (!docInfo?.deadline) return null;
    const deadline = new Date(docInfo.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysRemaining < 0;
    const isApproaching = daysRemaining >= 0 && daysRemaining < 3;
    return {
      deadline: docInfo.deadline,
      daysRemaining,
      isOverdue,
      isApproaching,
      status: isOverdue ? "overdue" : isApproaching ? "approaching" : "on-track",
    };
  }, [docInfo?.deadline]);

  const invalidFieldCount = useMemo(() => Object.keys(computedErrors).length, [computedErrors]);

  const jumpToField = useCallback((fieldId: string, pageNumber: number) => {
    if (currentPage !== pageNumber) {
      setCurrentPage(pageNumber);
      window.setTimeout(() => {
        const el = document.getElementById(`field-${fieldId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 160);
      return;
    }

    const el = document.getElementById(`field-${fieldId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentPage]);

  const saveResponse = useCallback(
    async (fieldId: string, globalKey: string, value: string) => {
      if (!templateId || !user) return;

      const fieldIds = globalFieldMap[globalKey] || [fieldId];

      setSaving(true);
      setSaved(false);

      const upserts = fieldIds.map((fid) => ({
        document_id: templateId,
        field_id: fid,
        global_key: globalKey,
        user_id: user.id,
        value,
        student_document_id: studentDocId,
      }));

      for (const upsert of upserts) {
        await supabase.from("field_responses").upsert(upsert as any, { onConflict: "document_id,field_id,user_id" });
      }

      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    [templateId, user, globalFieldMap, studentDocId]
  );

  const persistAllResponses = useCallback(async () => {
    if (!templateId || !user) return;

    const upserts = fields.map((field) => ({
      document_id: templateId,
      field_id: field.field_id,
      global_key: field.global_key,
      user_id: user.id,
      value: responses[field.field_id] || "",
      student_document_id: studentDocId,
    }));

    setSaving(true);
    setSaved(false);
    await Promise.all(
      upserts.map((upsert) =>
        supabase.from("field_responses").upsert(upsert as any, { onConflict: "document_id,field_id,user_id" })
      )
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [templateId, user, fields, responses, studentDocId]);

  const handleFieldChange = useCallback(
    (fieldId: string, globalKey: string, value: string) => {
      const linkedFieldIds = globalFieldMap[globalKey] || [fieldId];
      setResponses((prev) => {
        const updated = { ...prev, [fieldId]: value };
        linkedFieldIds.forEach((fid) => { updated[fid] = value; });
        return updated;
      });

      setFieldErrors((prev) => {
        const updated = { ...prev };
        linkedFieldIds.forEach((fid) => {
          const field = fieldById[fid];
          if (!field) return;
          const msg = validateFieldValue(field, value);
          if (msg) updated[fid] = msg;
          else delete updated[fid];
        });
        return updated;
      });

      setAutoFilled((prev) => {
        if (!prev.has(fieldId)) return prev;
        const next = new Set(prev);
        next.delete(fieldId);
        return next;
      });

      const requestedFieldIds = linkedFieldIds.filter((fid) => openCorrections.some((c) => c.field_id === fid));
      if (studentDocId && requestedFieldIds.length > 0) {
        supabase
          .from("student_document_corrections" as any)
          .update({ status: "resolved", resolved_at: new Date().toISOString() })
          .eq("student_document_id", studentDocId)
          .eq("status", "open")
          .in("field_id", requestedFieldIds);

        // Log status change to submission_status_events
        supabase
          .from("submission_status_events" as any)
          .insert({
            student_document_id: studentDocId,
            status: "resubmitted",
            previous_status: "changes_requested",
            change_reason: `Student corrected ${requestedFieldIds.length} field(s) and resubmitted`,
          })
          .catch((err) => console.warn("Failed to log resubmission status:", err));

        setOpenCorrections((prev) => prev.filter((c) => !requestedFieldIds.includes(c.field_id)));
      }

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        void saveResponse(fieldId, globalKey, value);
      }, 500);
    },
    [globalFieldMap, saveResponse, fieldById, openCorrections, studentDocId]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const completedPages = useMemo(() => {
    const s = new Set<number>();
    for (let p = 1; p <= totalPages; p++) {
      const pf = fields.filter((f) => f.page_number === p);
      const req = pf.filter((f) => f.is_required);
      if (req.length === 0 || req.every((f) => !validateFieldValue(f, responses[f.field_id] || ""))) s.add(p);
    }
    return s;
  }, [fields, responses, totalPages]);

  const handlePreview = async () => {
    if (!templateId || !studentDocId) return;

    const nextErrors: Record<string, string> = {};
    fields.forEach((field) => {
      const msg = validateFieldValue(field, responses[field.field_id] || "");
      if (msg) nextErrors[field.field_id] = msg;
    });

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      const firstInvalidField = fields.find((f) => nextErrors[f.field_id]);
      if (firstInvalidField) jumpToField(firstInvalidField.field_id, firstInvalidField.page_number);
      toast({
        title: "Please fix validation errors",
        description: `${Object.keys(nextErrors).length} field(s) need correction before preview.`,
        variant: "destructive",
      });
      return;
    }

    // Ensure latest in-memory edits are persisted before generation in preview page.
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    await persistAllResponses();

    // Mark as completed
    const { data: prevDoc } = await supabase
      .from("student_documents" as any)
      .select("status")
      .eq("id", studentDocId)
      .single();

    await supabase.from("student_documents" as any).update({
      status: "completed",
      completed_at: new Date().toISOString(),
      pages_completed: totalPages,
    }).eq("id", studentDocId);

    // Log status change
    if (prevDoc && prevDoc.status !== "completed") {
      await supabase.from("submission_status_events" as any).insert({
        student_document_id: studentDocId,
        status: "completed",
        previous_status: prevDoc.status,
        change_reason: "Student submitted form for review",
      });
    }

    // Navigate to preview
    navigate(`/student/preview/${templateId}${fromPreview ? "?regenerate=true" : ""}`);
  };

  const isLastPage = currentPage === totalPages;
  const progressPercent = (completedPages.size / totalPages) * 100;

  // Category grouping
  const categoryGroups = currentFields.reduce<Record<string, DocumentField[]>>((acc, f) => {
    const cat = f.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Progress bar */}
      <div className="h-[3px] bg-secondary">
        <motion.div className="h-full bg-primary" animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Split pane */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Page preview */}
        <div className="w-full md:w-2/5 p-4 md:p-6 border-b md:border-b-0 md:border-r border-border overflow-auto bg-background">
          <div className="card-surface p-6 aspect-[1/1.414] relative">
            <div className="text-xs text-muted-foreground mb-3 font-mono">Page {currentPage}</div>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              {currentFields.length === 0 ? (
                <p className="text-center text-muted-foreground/50 mt-8">No fields detected on this page</p>
              ) : (
                currentFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <span className="text-foreground/70">{field.label}:</span>
                    {field.field_type === "image" ? (
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        responses[field.field_id]
                          ? "bg-fc-success-bg text-fc-success border border-green-200"
                          : "bg-fc-orange-50 border-b-2 border-primary text-primary"
                      }`}>
                        {responses[field.field_id] ? "📷 Uploaded" : "📷 Upload needed"}
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        responses[field.field_id]
                          ? "bg-fc-success-bg text-fc-success border border-green-200"
                          : "bg-fc-orange-50 border-b-2 border-primary text-primary"
                      }`}>
                        {responses[field.field_id] || field.detect_hint || "___________"}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="absolute bottom-3 right-3">
              <Badge variant="outline" className="text-xs font-mono bg-fc-orange-50 text-fc-orange-700">{currentPage}/{totalPages}</Badge>
            </div>
          </div>
        </div>

        {/* Right: Form fields */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-card">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display text-xl font-semibold text-foreground">Page {currentPage} Fields</h2>
                <div className="flex items-center gap-2">
                  {openCorrections.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const firstCorr = openCorrections[0];
                        const field = fieldById[firstCorr.field_id];
                        if (field) jumpToField(firstCorr.field_id, field.page_number);
                      }}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Jump to Correction
                    </Button>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                    {saved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-fc-success"><Check className="h-3 w-3" />Saved</motion.span>}
                  </div>
                </div>
              </div>

              {autoFilled.size > 0 && currentFields.some((f) => autoFilled.has(f.field_id)) && (
                <div className="bg-fc-orange-50 border border-fc-orange-200 rounded-lg p-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-xs text-foreground">Some fields were auto-filled from your profile. Review and update if needed.</p>
                </div>
              )}

              {deadlineInfo && (
                <div className={`rounded-lg border p-3 flex items-center justify-between ${
                  deadlineInfo.status === "overdue"
                    ? "border-red-300 bg-red-50"
                    : deadlineInfo.status === "approaching"
                    ? "border-yellow-300 bg-yellow-50"
                    : "border-green-300 bg-green-50"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${
                      deadlineInfo.status === "overdue"
                        ? "text-red-700"
                        : deadlineInfo.status === "approaching"
                        ? "text-yellow-700"
                        : "text-green-700"
                    }`}>
                      {deadlineInfo.status === "overdue" && "⏰ "}
                      {new Date(deadlineInfo.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className={`text-xs ${
                      deadlineInfo.status === "overdue"
                        ? "text-red-600"
                        : deadlineInfo.status === "approaching"
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}>
                      {deadlineInfo.isOverdue
                        ? `${Math.abs(deadlineInfo.daysRemaining)} day${Math.abs(deadlineInfo.daysRemaining) === 1 ? "" : "s"} overdue`
                        : deadlineInfo.daysRemaining === 0
                        ? "Due today"
                        : `${deadlineInfo.daysRemaining} day${deadlineInfo.daysRemaining === 1 ? "" : "s"} remaining`}
                    </span>
                  </div>
                  <Badge className={`text-xs ${
                    deadlineInfo.status === "overdue"
                      ? "bg-red-600 text-white"
                      : deadlineInfo.status === "approaching"
                      ? "bg-yellow-600 text-white"
                      : "bg-green-600 text-white"
                  }`}>
                    {deadlineInfo.status === "overdue" ? "OVERDUE" : deadlineInfo.status === "approaching" ? "URGENT" : "ON TRACK"}
                  </Badge>
                </div>
              )}

              {openCorrections.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                    <p className="text-sm font-medium text-foreground">
                      Faculty requested corrections for {openCorrections.length} field{openCorrections.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-auto pr-1">
                    {openCorrections.map((request) => {
                      const field = fieldById[request.field_id];
                      if (!field) return null;
                      return (
                        <button
                          key={request.id}
                          type="button"
                          onClick={() => jumpToField(request.field_id, field.page_number)}
                          className="w-full text-left text-xs rounded border border-amber-200 bg-white px-2 py-1 hover:border-amber-400"
                        >
                          <span className="font-medium text-foreground">{field.label}</span>
                          <span className="text-muted-foreground"> · Page {field.page_number}</span>
                          {request.comment ? <span className="text-amber-800"> · {request.comment}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {invalidFieldCount > 0 && (
                <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-medium text-foreground">
                      Fix {invalidFieldCount} issue{invalidFieldCount === 1 ? "" : "s"} before preview
                    </p>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-auto pr-1">
                    {Object.entries(errorSummaryByPage)
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .map(([page, items]) => (
                        <div key={page} className="text-xs">
                          <p className="text-muted-foreground mb-1">Page {page}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {items.map((item) => (
                              <button
                                key={item.fieldId}
                                type="button"
                                className="px-2 py-1 rounded bg-background border border-border text-foreground hover:border-primary/40"
                                onClick={() => jumpToField(item.fieldId, Number(page))}
                                title={item.message}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {currentFields.length === 0 ? (
                <div className="card-surface p-8 text-center">
                  <p className="text-muted-foreground">No fields detected on this page.</p>
                </div>
              ) : (
                Object.entries(categoryGroups).map(([category, catFields]) => (
                  <div key={category}>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 border-b border-border pb-1 capitalize">{category} Details</p>
                    <div className="space-y-4">
                      {catFields.map((field) => {
                        const isAuto = autoFilled.has(field.field_id);
                        const correction = openCorrections.find((c) => c.field_id === field.field_id);
                        const hasError = !!computedErrors[field.field_id];
                        const borderColor = correction ? "border-red-300 bg-red-50/30" : hasError ? "border-destructive/40" : "border-fc-orange-200";
                        const borderStyle = correction ? "border-l-[3px] border-red-400" : "border-l-[3px] border-fc-orange-200";
                        
                        return (
                          <div id={`field-${field.field_id}`} key={field.id} className={`${borderStyle} pl-4 space-y-1.5 rounded-r p-3.5 ${borderColor}`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              {field.is_required && <span className="text-destructive text-lg leading-none">•</span>}
                              <Label className="text-sm text-foreground">{field.label}</Label>
                              {isAuto && <Badge className="text-[10px] bg-fc-orange-50 text-fc-orange-600 border border-fc-orange-200">Auto-filled</Badge>}
                              {correction && (
                                <Badge className="text-[10px] bg-red-100 text-red-700 border border-red-300 font-semibold">
                                  ⚠️ Correction Needed
                                </Badge>
                              )}
                            </div>
                            {correction && correction.comment && (
                              <div className="mt-2 p-2.5 rounded-md bg-red-100 border border-red-200">
                                <p className="text-xs font-medium text-red-900 mb-1">Faculty comment:</p>
                                <p className="text-xs text-red-800">{correction.comment}</p>
                              </div>
                            )}
                            {field.field_type === "image" ? (
                              <ImageUploadField
                                fieldId={field.field_id}
                                label={field.label}
                                value={responses[field.field_id] || ""}
                                userId={user!.id}
                                templateId={templateId!}
                                onUploaded={(path) => handleFieldChange(field.field_id, field.global_key, path)}
                              />
                            ) : field.field_type === "select" ? (
                              <Select
                                value={responses[field.field_id] || ""}
                                onValueChange={(value) => handleFieldChange(field.field_id, field.global_key, value)}
                              >
                                <SelectTrigger className={`bg-background focus-ring-orange ${correction ? "border-red-400 border-2" : "border-border"}`}>
                                  <SelectValue placeholder={field.detect_hint || `Select ${field.label.toLowerCase()}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {getSelectOptions(field.select_options).map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : field.field_type === "textarea" ? (
                              <Textarea
                                value={responses[field.field_id] || ""}
                                onChange={(e) => handleFieldChange(field.field_id, field.global_key, e.target.value)}
                                placeholder={field.detect_hint || `Enter ${field.label.toLowerCase()}`}
                                className={`bg-background focus-ring-orange ${correction ? "border-red-400 border-2" : "border-border"}`}
                              />
                            ) : field.field_type === "date" ? (
                              <Input type="date" value={responses[field.field_id] || ""} onChange={(e) => handleFieldChange(field.field_id, field.global_key, e.target.value)} className={`bg-background focus-ring-orange ${correction ? "border-red-400 border-2" : "border-border"}`} />
                            ) : (
                              <Input
                                type={field.field_type === "number" ? "number" : "text"}
                                value={responses[field.field_id] || ""}
                                onChange={(e) => handleFieldChange(field.field_id, field.global_key, e.target.value)}
                                placeholder={field.detect_hint || `Enter ${field.label.toLowerCase()}`}
                                className={`bg-background focus-ring-orange ${correction ? "border-red-400 border-2" : "border-border"}`}
                              />
                            )}
                            {computedErrors[field.field_id] && (
                              <p className="text-xs text-destructive">{computedErrors[field.field_id]}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="border-t border-border px-4 md:px-6 py-3 flex items-center justify-between shrink-0 bg-card">
        <Button variant="outline" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="border-border">
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
        {isLastPage ? (
          <Button onClick={handlePreview} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {fromPreview ? <><RefreshCw className="h-4 w-4 mr-1" /> Update & Preview Again</> : <><Eye className="h-4 w-4 mr-1" /> Preview Document</>}
          </Button>
        ) : (
          <Button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Save & Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
