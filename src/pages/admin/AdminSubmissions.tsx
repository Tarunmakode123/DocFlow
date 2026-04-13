import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ClipboardList, Download, History, Loader2, Search, XCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type ReviewStatus = "pending" | "approved" | "rejected";

type SubmissionRow = {
  id: string;
  student_id: string;
  source_document_id: string;
  status: string | null;
  pages_completed: number | null;
  completed_at: string | null;
  downloaded_at: string | null;
  started_at: string | null;
  generated_file_path: string | null;
  documents?: {
    template_label?: string | null;
    original_filename?: string | null;
    department_scope?: string | null;
  } | null;
};

type ReviewRow = {
  student_document_id: string;
  review_status: ReviewStatus;
  review_comment: string | null;
  reviewed_at: string | null;
};

type StudentProfile = {
  id: string;
  role?: string | null;
  full_name: string | null;
  roll_number: string | null;
  department: string | null;
  semester: string | null;
};

type PendingTemplateTracker = {
  templateId: string;
  templateName: string;
  departmentScope: string | null;
  semesterScope: string | null;
  expectedCount: number;
  submittedCount: number;
  pendingStudents: Array<{ id: string; full_name: string | null; roll_number: string | null; department: string | null; semester: string | null }>;
};

type ReviewEvent = {
  id: string;
  student_document_id: string;
  review_status: ReviewStatus;
  review_comment: string | null;
  reviewed_by: string | null;
  created_at: string;
};

type CorrectionOption = {
  field_id: string;
  label: string;
  page_number: number;
  value: string;
};

const reviewBadgeClass: Record<ReviewStatus, string> = {
  pending: "bg-fc-warning-bg text-fc-warning border border-amber-200",
  approved: "bg-fc-success-bg text-fc-success border border-green-200",
  rejected: "bg-fc-error-bg text-fc-error border border-red-200",
};

export default function AdminSubmissions() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewStatus | "all">("pending");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, StudentProfile>>({});
  const [reviewsBySubmission, setReviewsBySubmission] = useState<Record<string, ReviewRow>>({});
  const [historyOpenFor, setHistoryOpenFor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyBySubmission, setHistoryBySubmission] = useState<Record<string, ReviewEvent[]>>({});
  const [openCorrectionCountBySubmission, setOpenCorrectionCountBySubmission] = useState<Record<string, number>>({});
  const [pendingTrackers, setPendingTrackers] = useState<PendingTemplateTracker[]>([]);
  const [correctionDialogFor, setCorrectionDialogFor] = useState<SubmissionRow | null>(null);
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [correctionOptions, setCorrectionOptions] = useState<CorrectionOption[]>([]);
  const [selectedCorrectionFields, setSelectedCorrectionFields] = useState<Record<string, boolean>>({});
  const [correctionComment, setCorrectionComment] = useState("");

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: docsData, error: docsError } = await supabase
      .from("student_documents" as any)
      .select("id, student_id, source_document_id, status, pages_completed, completed_at, downloaded_at, started_at, generated_file_path, documents!student_documents_source_document_id_fkey(template_label, original_filename, department_scope)")
      .in("status", ["completed", "downloaded"]) // review-ready submissions
      .order("completed_at", { ascending: false });

    if (docsError) {
      toast({ title: "Failed to load submissions", description: docsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const rows = ((docsData || []) as unknown) as SubmissionRow[];
    setSelectedIds({});

    const studentIds = Array.from(new Set(rows.map((r) => r.student_id).filter(Boolean)));
    const submissionIds = rows.map((r) => r.id);

    if (studentIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("user_profiles")
        .select("id, full_name, roll_number, department, semester")
        .in("id", studentIds);

      const profileMap: Record<string, StudentProfile> = {};
      (profilesData || []).forEach((p: any) => {
        profileMap[p.id] = p as StudentProfile;
      });
      setProfilesById(profileMap);
    } else {
      setProfilesById({});
    }

    if (submissionIds.length > 0) {
      const { data: reviewsData } = await supabase
        .from("student_document_reviews" as any)
        .select("student_document_id, review_status, review_comment, reviewed_at")
        .in("student_document_id", submissionIds);

      const reviewMap: Record<string, ReviewRow> = {};
      (reviewsData || []).forEach((r: any) => {
        reviewMap[r.student_document_id] = r as ReviewRow;
      });
      setReviewsBySubmission(reviewMap);

      const submittedRows = rows.filter((row) => !!reviewMap[row.id]);
      setSubmissions(submittedRows);

      const { data: correctionRows } = await supabase
        .from("student_document_corrections" as any)
        .select("student_document_id, status")
        .in("student_document_id", submissionIds)
        .eq("status", "open");

      const correctionMap: Record<string, number> = {};
      (correctionRows || []).forEach((row: any) => {
        correctionMap[row.student_document_id] = (correctionMap[row.student_document_id] || 0) + 1;
      });
      setOpenCorrectionCountBySubmission(correctionMap);
    } else {
      setSubmissions([]);
      setReviewsBySubmission({});
      setOpenCorrectionCountBySubmission({});
    }

    const normalize = (value?: string | null) => (value || "").trim().toUpperCase();
    const matchesScope = (
      template: { department_scope?: string | null; semester_scope?: string | null },
      student: { department?: string | null; semester?: string | null }
    ) => {
      const deptScope = normalize(template.department_scope);
      const semScope = normalize(template.semester_scope);
      const deptValue = normalize(student.department);
      const semValue = normalize(student.semester);

      const deptOk = !deptScope || deptScope === "ALL" || !deptValue || deptScope === deptValue;
      const semOk = !semScope || semScope === "ALL" || !semValue || semScope === semValue;
      return deptOk && semOk;
    };

    const [{ data: templateRows }, { data: allStudentsRows }] = await Promise.all([
      supabase
        .from("documents")
        .select("id, template_label, original_filename, department_scope, semester_scope")
        .eq("user_id", user.id)
        .eq("is_published", true),
      supabase
        .from("user_profiles")
        .select("id, role, full_name, roll_number, department, semester")
        .eq("role", "student"),
    ]);

    const templates = (templateRows || []) as any[];
    const allStudents = ((allStudentsRows || []) as any[]).map((s) => s as StudentProfile);

    if (templates.length > 0 && allStudents.length > 0) {
      const templateIds = templates.map((t) => t.id);
      const { data: allStudentDocs } = await supabase
        .from("student_documents" as any)
        .select("student_id, source_document_id")
        .in("source_document_id", templateIds);

      const submittedPair = new Set(
        ((allStudentDocs || []) as any[]).map((d) => `${d.source_document_id}:${d.student_id}`)
      );

      const trackers: PendingTemplateTracker[] = templates.map((tpl) => {
        const eligibleStudents = allStudents.filter((s) =>
          matchesScope(
            { department_scope: tpl.department_scope, semester_scope: tpl.semester_scope },
            { department: s.department, semester: s.semester }
          )
        );

        const pendingStudents = eligibleStudents.filter(
          (s) => !submittedPair.has(`${tpl.id}:${s.id}`)
        );

        return {
          templateId: tpl.id,
          templateName: tpl.template_label || tpl.original_filename || "Untitled template",
          departmentScope: tpl.department_scope || null,
          semesterScope: tpl.semester_scope || null,
          expectedCount: eligibleStudents.length,
          submittedCount: eligibleStudents.length - pendingStudents.length,
          pendingStudents,
        };
      });

      setPendingTrackers(trackers);
    } else {
      setPendingTrackers([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const effectiveStatus = (submissionId: string): ReviewStatus => {
    return reviewsBySubmission[submissionId]?.review_status || "pending";
  };

  const filteredSubmissions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions.filter((row) => {
      const status = effectiveStatus(row.id);
      if (filter !== "all" && status !== filter) return false;

      if (!q) return true;
      const profile = profilesById[row.student_id];
      const templateName = row.documents?.template_label || row.documents?.original_filename || "";
      const studentName = profile?.full_name || "";
      const rollNo = profile?.roll_number || "";
      const dept = profile?.department || "";
      const text = `${templateName} ${studentName} ${rollNo} ${dept}`.toLowerCase();
      return text.includes(q);
    });
  }, [submissions, filter, query, reviewsBySubmission, profilesById]);

  const counts = useMemo(() => {
    const base = { all: submissions.length, pending: 0, approved: 0, rejected: 0 };
    submissions.forEach((row) => {
      const st = effectiveStatus(row.id);
      base[st] += 1;
    });
    return base;
  }, [submissions, reviewsBySubmission]);

  const allFilteredSelected =
    filteredSubmissions.length > 0 && filteredSubmissions.every((row) => selectedIds[row.id]);

  const selectedCount = useMemo(
    () => Object.values(selectedIds).filter(Boolean).length,
    [selectedIds]
  );

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      filteredSubmissions.forEach((row) => {
        next[row.id] = checked;
      });
      return next;
    });
  };

  const toggleSelectOne = (submissionId: string, checked: boolean) => {
    setSelectedIds((prev) => ({ ...prev, [submissionId]: checked }));
  };

  const toCsvCell = (value: string | number | null | undefined) => {
    const text = String(value ?? "").replace(/"/g, '""');
    return `"${text}"`;
  };

  const exportCsv = () => {
    const rowsToExport = filteredSubmissions.filter((row) => selectedIds[row.id]);
    if (rowsToExport.length === 0) {
      toast({ title: "No rows selected", description: "Select at least one submission to export." });
      return;
    }

    const header = [
      "submission_id",
      "template_name",
      "student_name",
      "roll_number",
      "department",
      "semester",
      "review_status",
      "review_comment",
      "started_at",
      "completed_at",
      "downloaded_at",
      "generated_file_path",
    ];

    const lines = [header.map((h) => toCsvCell(h)).join(",")];

    rowsToExport.forEach((row) => {
      const profile = profilesById[row.student_id];
      const review = reviewsBySubmission[row.id];
      const templateName = row.documents?.template_label || row.documents?.original_filename || "Untitled template";
      lines.push(
        [
          row.id,
          templateName,
          profile?.full_name || "",
          profile?.roll_number || "",
          profile?.department || "",
          profile?.semester || "",
          effectiveStatus(row.id),
          review?.review_comment || "",
          row.started_at || "",
          row.completed_at || "",
          row.downloaded_at || "",
          row.generated_file_path || "",
        ]
          .map((cell) => toCsvCell(cell))
          .join(",")
      );
    });

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissions_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "CSV exported", description: `${rowsToExport.length} submission(s) exported.` });
  };

  const getSelectedSubmissionIds = () =>
    filteredSubmissions.filter((row) => selectedIds[row.id]).map((row) => row.id);

  const loadHistory = async (submissionId: string) => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("student_document_review_events" as any)
      .select("id, student_document_id, review_status, review_comment, reviewed_by, created_at")
      .eq("student_document_id", submissionId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load history", description: error.message, variant: "destructive" });
      setHistoryLoading(false);
      return;
    }

    setHistoryBySubmission((prev) => ({ ...prev, [submissionId]: ((data || []) as unknown) as ReviewEvent[] }));
    setHistoryLoading(false);
  };

  const persistReviewChanges = async (ids: string[], status: ReviewStatus, comment?: string) => {
    const reviewedAt = new Date().toISOString();

    const reviewPayload = ids.map((id) => ({
      student_document_id: id,
      review_status: status,
      review_comment: comment || null,
      reviewed_at: reviewedAt,
      reviewed_by: user?.id,
    }));

    const { error: reviewError } = await supabase
      .from("student_document_reviews" as any)
      .upsert(reviewPayload as any, { onConflict: "student_document_id" });

    if (reviewError) {
      return { ok: false as const, error: reviewError.message };
    }

    const eventPayload = ids.map((id) => ({
      student_document_id: id,
      review_status: status,
      review_comment: comment || null,
      reviewed_by: user?.id,
    }));

    const { error: eventError } = await supabase
      .from("student_document_review_events" as any)
      .insert(eventPayload as any);

    if (eventError) {
      return { ok: false as const, error: eventError.message };
    }

    // Log status changes to submission_status_events
    const statusMap: Record<ReviewStatus, string> = {
      approved: "approved",
      rejected: "rejected",
      pending: "under_review",
    };

    const statusEventPayload = ids.map((id) => ({
      student_document_id: id,
      status: statusMap[status],
      previous_status: "submitted",
      changed_by: user?.id,
      change_reason: status === "rejected" ? `Rejected by faculty: ${comment || "No reason provided"}` : `Approved by faculty: ${comment || "No comment"}`,
    }));

    const { error: statusEventError } = await supabase
      .from("submission_status_events" as any)
      .insert(statusEventPayload as any);

    if (statusEventError) {
      console.warn("Failed to log status change event:", statusEventError);
      // Don't return error here as the review was already recorded
    }

    setReviewsBySubmission((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = {
          student_document_id: id,
          review_status: status,
          review_comment: comment || null,
          reviewed_at: reviewedAt,
        };
      });
      return next;
    });

    return { ok: true as const, reviewedAt };
  };

  const openCorrectionDialog = async (row: SubmissionRow) => {
    setCorrectionDialogFor(row);
    setCorrectionLoading(true);
    setCorrectionOptions([]);
    setSelectedCorrectionFields({});
    setCorrectionComment("Please correct the highlighted fields and resubmit.");

    const [{ data: responseRows, error: responsesError }, { data: docFields, error: fieldsError }] = await Promise.all([
      supabase
        .from("field_responses")
        .select("field_id, value")
        .eq("student_document_id", row.id),
      supabase
        .from("document_fields")
        .select("field_id, label, page_number")
        .eq("document_id", row.source_document_id)
        .order("page_number")
        .order("order_index"),
    ]);

    if (responsesError || fieldsError) {
      toast({ title: "Failed to load fields", description: responsesError?.message || fieldsError?.message || "Unknown error", variant: "destructive" });
      setCorrectionLoading(false);
      return;
    }

    const responseMap: Record<string, string> = {};
    (responseRows || []).forEach((r: any) => {
      responseMap[r.field_id] = r.value || "";
    });

    const options = ((docFields || []) as any[]).map((f) => ({
      field_id: f.field_id,
      label: f.label,
      page_number: f.page_number,
      value: responseMap[f.field_id] || "",
    }));

    setCorrectionOptions(options);
    setCorrectionLoading(false);
  };

  const submitCorrectionRequest = async () => {
    if (!correctionDialogFor) return;

    const selectedFieldIds = Object.entries(selectedCorrectionFields)
      .filter(([, checked]) => checked)
      .map(([fieldId]) => fieldId);

    if (selectedFieldIds.length === 0) {
      toast({ title: "No fields selected", description: "Select at least one field for correction." });
      return;
    }

    setCorrectionLoading(true);

    const { data: existingOpen } = await supabase
      .from("student_document_corrections" as any)
      .select("field_id")
      .eq("student_document_id", correctionDialogFor.id)
      .eq("status", "open")
      .in("field_id", selectedFieldIds);

    const alreadyOpen = new Set((existingOpen || []).map((r: any) => r.field_id));
    const fieldIdsToInsert = selectedFieldIds.filter((fieldId) => !alreadyOpen.has(fieldId));

    if (fieldIdsToInsert.length > 0) {
      const payload = fieldIdsToInsert.map((fieldId) => ({
        student_document_id: correctionDialogFor.id,
        field_id: fieldId,
        comment: correctionComment || null,
        requested_by: user?.id,
      }));

      const { error } = await supabase
        .from("student_document_corrections" as any)
        .insert(payload as any);

      if (error) {
        toast({ title: "Failed to request corrections", description: error.message, variant: "destructive" });
        setCorrectionLoading(false);
        return;
      }
    }

    await persistReviewChanges(
      [correctionDialogFor.id],
      "rejected",
      correctionComment || "Please correct requested fields and resubmit."
    );

    setOpenCorrectionCountBySubmission((prev) => ({
      ...prev,
      [correctionDialogFor.id]: (prev[correctionDialogFor.id] || 0) + fieldIdsToInsert.length,
    }));

    toast({
      title: "Correction requested",
      description: `${selectedFieldIds.length} field(s) marked for correction.`,
    });

    setCorrectionDialogFor(null);
    setCorrectionOptions([]);
    setSelectedCorrectionFields({});
    setCorrectionComment("");
    setCorrectionLoading(false);
  };

  const bulkUpdateReviewStatus = async (status: ReviewStatus, comment?: string) => {
    const ids = getSelectedSubmissionIds();
    if (ids.length === 0) {
      toast({ title: "No rows selected", description: "Select at least one submission first." });
      return;
    }

    setUpdatingId("bulk");
    const result = await persistReviewChanges(ids, status, comment);

    if (!result.ok) {
      toast({ title: "Bulk update failed", description: result.error, variant: "destructive" });
      setUpdatingId(null);
      return;
    }

    setSelectedIds((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = false;
      });
      return next;
    });

    toast({ title: `Bulk ${status} complete`, description: `${ids.length} submission(s) updated.` });
    setUpdatingId(null);
  };

  const updateReviewStatus = async (submissionId: string, status: ReviewStatus, comment?: string) => {
    setUpdatingId(submissionId);

    const result = await persistReviewChanges([submissionId], status, comment);

    if (!result.ok) {
      toast({ title: "Review update failed", description: result.error, variant: "destructive" });
      setUpdatingId(null);
      return;
    }

    if (historyOpenFor === submissionId) {
      await loadHistory(submissionId);
    }

    toast({ title: `Submission ${status}`, description: "Review status updated successfully." });
    setUpdatingId(null);
  };

  const handleReject = async (submissionId: string) => {
    const reason = window.prompt("Add a rejection reason (optional):", "Please correct missing/invalid fields.");
    await updateReviewStatus(submissionId, "rejected", reason || undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Submissions</h1>
          <p className="text-muted-foreground mt-1">Review completed student submissions before final acceptance</p>
        </div>
      </div>

      <div className="card-surface p-4 mb-5 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
            Pending ({counts.pending})
          </Button>
          <Button size="sm" variant={filter === "approved" ? "default" : "outline"} onClick={() => setFilter("approved")}>
            Approved ({counts.approved})
          </Button>
          <Button size="sm" variant={filter === "rejected" ? "default" : "outline"} onClick={() => setFilter("rejected")}>
            Rejected ({counts.rejected})
          </Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            All ({counts.all})
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student or template"
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={selectedCount === 0}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV ({selectedCount})
          </Button>
          <Button
            variant="outline"
            disabled={selectedCount === 0 || updatingId === "bulk"}
            onClick={() => bulkUpdateReviewStatus("approved")}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Bulk Approve
          </Button>
          <Button
            variant="outline"
            disabled={selectedCount === 0 || updatingId === "bulk"}
            onClick={() => {
              const reason = window.prompt("Add a rejection reason for selected submissions (optional):", "Please correct missing/invalid fields.");
              bulkUpdateReviewStatus("rejected", reason || undefined);
            }}
            className="text-fc-error border-red-200 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Bulk Reject
          </Button>
        </div>
      </div>

      {pendingTrackers.length > 0 && (
        <div className="card-surface p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">Students Yet To Submit</h3>
          </div>
          <div className="space-y-3">
            {pendingTrackers.map((tracker) => (
              <div key={tracker.templateId} className="border border-border rounded-md p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{tracker.templateName}</p>
                    <p className="text-xs text-muted-foreground">
                      Scope: {tracker.departmentScope || "ALL"} · Sem {tracker.semesterScope || "ALL"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {tracker.submittedCount}/{tracker.expectedCount} submitted
                  </Badge>
                </div>
                {tracker.pendingStudents.length === 0 ? (
                  <p className="text-xs text-fc-success">All eligible students have submitted.</p>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Pending: {tracker.pendingStudents.slice(0, 8).map((s) => `${s.full_name || "Student"}${s.roll_number ? ` (${s.roll_number})` : ""}`).join(", ")}
                    {tracker.pendingStudents.length > 8 ? ` +${tracker.pendingStudents.length - 8} more` : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredSubmissions.length > 0 && (
        <div className="flex items-center justify-between mb-3 px-1">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Checkbox
              checked={allFilteredSelected}
              onCheckedChange={(checked) => toggleSelectAllFiltered(Boolean(checked))}
            />
            Select all visible ({filteredSubmissions.length})
          </label>
          {selectedCount > 0 && <span className="text-xs text-muted-foreground">{selectedCount} selected</span>}
        </div>
      )}

      {filteredSubmissions.length === 0 ? (
        <div className="card-surface p-12 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No submissions found</h3>
          <p className="text-muted-foreground">Completed student submissions will appear here for review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((row, i) => {
            const profile = profilesById[row.student_id];
            const review = reviewsBySubmission[row.id];
            const status = effectiveStatus(row.id);
            const templateName = row.documents?.template_label || row.documents?.original_filename || "Untitled template";

            return (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card-surface-hover p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={!!selectedIds[row.id]}
                      onCheckedChange={(checked) => toggleSelectOne(row.id, Boolean(checked))}
                      className="mt-1"
                    />
                    <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h3 className="font-medium text-foreground">{templateName}</h3>
                      <Badge className={reviewBadgeClass[status]}>{status}</Badge>
                      {(openCorrectionCountBySubmission[row.id] || 0) > 0 && (
                        <Badge className="bg-fc-warning-bg text-fc-warning border border-amber-200">
                          {openCorrectionCountBySubmission[row.id]} correction pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {profile?.full_name || "Student"}
                      {profile?.roll_number ? ` · Roll: ${profile.roll_number}` : ""}
                      {profile?.department ? ` · ${profile.department}` : ""}
                      {profile?.semester ? ` · Sem ${profile.semester}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Started: {row.started_at ? new Date(row.started_at).toLocaleDateString() : "-"}
                      {row.completed_at ? ` · Completed: ${new Date(row.completed_at).toLocaleDateString()}` : ""}
                      {row.downloaded_at ? ` · Downloaded: ${new Date(row.downloaded_at).toLocaleDateString()}` : ""}
                    </p>
                    {review?.review_comment && (
                      <p className="text-xs text-fc-error mt-2">Note: {review.review_comment}</p>
                    )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Dialog
                      open={correctionDialogFor?.id === row.id}
                      onOpenChange={(open) => {
                        if (open) openCorrectionDialog(row);
                        else if (correctionDialogFor?.id === row.id) setCorrectionDialogFor(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border-border">
                          Request Corrections
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Request Field Corrections</DialogTitle>
                          <DialogDescription>
                            Select fields the student should update and add an optional note.
                          </DialogDescription>
                        </DialogHeader>

                        {correctionLoading ? (
                          <div className="py-8 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        ) : correctionOptions.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-6 text-center">No captured response fields found for this submission.</p>
                        ) : (
                          <>
                            <div className="max-h-[40vh] overflow-auto pr-2 space-y-2">
                              {correctionOptions.map((option) => (
                                <label key={option.field_id} className="flex items-start gap-3 rounded-md border border-border p-2.5 cursor-pointer">
                                  <Checkbox
                                    checked={!!selectedCorrectionFields[option.field_id]}
                                    onCheckedChange={(checked) =>
                                      setSelectedCorrectionFields((prev) => ({ ...prev, [option.field_id]: Boolean(checked) }))
                                    }
                                    className="mt-1"
                                  />
                                  <div>
                                    <p className="text-sm font-medium text-foreground">
                                      {option.label} <span className="text-xs text-muted-foreground">(Page {option.page_number})</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground break-all">
                                      Current value: {option.value || "(empty)"}
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>

                            <div className="space-y-1 mt-2">
                              <Label className="text-xs text-muted-foreground">Note to student (optional)</Label>
                              <Textarea
                                value={correctionComment}
                                onChange={(e) => setCorrectionComment(e.target.value)}
                                placeholder="Explain what to correct..."
                              />
                            </div>

                            <div className="flex justify-end gap-2 mt-3">
                              <Button variant="outline" onClick={() => setCorrectionDialogFor(null)}>
                                Cancel
                              </Button>
                              <Button onClick={submitCorrectionRequest} disabled={correctionLoading}>
                                Request Corrections
                              </Button>
                            </div>
                          </>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Dialog
                      open={historyOpenFor === row.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setHistoryOpenFor(row.id);
                          loadHistory(row.id);
                        } else if (historyOpenFor === row.id) {
                          setHistoryOpenFor(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border-border">
                          <History className="h-4 w-4 mr-1" />
                          History
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Review History</DialogTitle>
                          <DialogDescription>
                            {templateName} · {profile?.full_name || "Student"}
                          </DialogDescription>
                        </DialogHeader>

                        {historyLoading ? (
                          <div className="py-10 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        ) : (historyBySubmission[row.id] || []).length === 0 ? (
                          <div className="py-8 text-center text-sm text-muted-foreground">No review history yet.</div>
                        ) : (
                          <div className="max-h-[55vh] overflow-auto pr-2 space-y-2">
                            {(historyBySubmission[row.id] || []).map((event) => (
                              <div key={event.id} className="rounded-lg border border-border p-3">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <Badge className={reviewBadgeClass[event.review_status]}>{event.review_status}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(event.created_at).toLocaleString()}
                                  </span>
                                </div>
                                {event.review_comment ? (
                                  <p className="text-sm text-foreground">{event.review_comment}</p>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No comment provided.</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === row.id}
                      onClick={() => updateReviewStatus(row.id, "approved")}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === row.id}
                      onClick={() => handleReject(row.id)}
                      className="text-fc-error border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
