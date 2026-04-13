import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileEdit, ArrowRight, Loader2, CheckCircle, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const matchesScope = (
  template: { department_scope?: string | null; semester_scope?: string | null },
  profile?: { department?: string | null; semester?: string | null } | null
) => {
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

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [studentDocs, setStudentDocs] = useState<any[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [facultyById, setFacultyById] = useState<Record<string, string>>({});
  const [reviewsBySubmission, setReviewsBySubmission] = useState<
    Record<string, { review_status: "pending" | "approved" | "rejected"; review_comment?: string | null; reviewed_at?: string | null }>
  >({});
  const [openCorrectionCountBySubmission, setOpenCorrectionCountBySubmission] = useState<Record<string, number>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: studentData }, { data: docsData }] = await Promise.all([
        supabase
          .from("student_documents" as any)
          .select("*, documents!student_documents_source_document_id_fkey(template_label, original_filename, total_pages, department_scope, user_id)")
          .eq("student_id", user.id)
          .order("started_at", { ascending: false }),
        supabase
          .from("documents")
          .select("id, user_id, template_label, original_filename, total_pages, department_scope, semester_scope, published_at")
          .eq("is_published", true)
          .order("published_at", { ascending: false }),
      ]);

      if (studentData) setStudentDocs(studentData);
      if (docsData) {
        const filtered = docsData.filter((t) => matchesScope(t as any, profile as any));
        setAvailableTemplates(filtered);
      }

      const facultyIds = Array.from(
        new Set([
          ...((docsData || []).map((d: any) => d.user_id).filter(Boolean)),
          ...((studentData || []).map((d: any) => d.documents?.user_id).filter(Boolean)),
        ])
      );
      if (facultyIds.length > 0) {
        const { data: facultyProfiles } = await supabase
          .from("user_profiles")
          .select("id, full_name")
          .in("id", facultyIds);

        const facultyMap: Record<string, string> = {};
        (facultyProfiles || []).forEach((p: any) => {
          facultyMap[p.id] = p.full_name || "Faculty";
        });
        setFacultyById(facultyMap);
      } else {
        setFacultyById({});
      }

      const submissionIds = (studentData || []).map((d: any) => d.id);
      if (submissionIds.length > 0) {
        const { data: reviewRows } = await supabase
          .from("student_document_reviews" as any)
          .select("student_document_id, review_status, review_comment, reviewed_at")
          .in("student_document_id", submissionIds);

        const reviewMap: Record<string, { review_status: "pending" | "approved" | "rejected"; review_comment?: string | null; reviewed_at?: string | null }> = {};
        (reviewRows || []).forEach((row: any) => {
          reviewMap[row.student_document_id] = {
            review_status: row.review_status,
            review_comment: row.review_comment,
            reviewed_at: row.reviewed_at,
          };
        });
        setReviewsBySubmission(reviewMap);

        const { data: correctionRows } = await supabase
          .from("student_document_corrections" as any)
          .select("student_document_id")
          .in("student_document_id", submissionIds)
          .eq("status", "open");

        const correctionMap: Record<string, number> = {};
        (correctionRows || []).forEach((row: any) => {
          correctionMap[row.student_document_id] = (correctionMap[row.student_document_id] || 0) + 1;
        });
        setOpenCorrectionCountBySubmission(correctionMap);
      } else {
        setReviewsBySubmission({});
        setOpenCorrectionCountBySubmission({});
      }
      setLoading(false);
    };
    load();
  }, [user, profile]);

  const submitToFaculty = async (studentDocumentId: string) => {
    if (!user) return;
    setSubmittingId(studentDocumentId);

    const { error: reviewError } = await supabase
      .from("student_document_reviews" as any)
      .insert({
        student_document_id: studentDocumentId,
        review_status: "pending",
        review_comment: null,
        reviewed_by: null,
        reviewed_at: null,
      } as any);

    if (reviewError && reviewError.code !== "23505") {
      toast({ title: "Submit failed", description: reviewError.message, variant: "destructive" });
      setSubmittingId(null);
      return;
    }

    await supabase.from("student_document_review_events" as any).insert({
      student_document_id: studentDocumentId,
      review_status: "pending",
      review_comment: "Submitted by student",
      reviewed_by: user.id,
    } as any);

    await supabase.from("submission_status_events" as any).insert({
      student_document_id: studentDocumentId,
      status: "submitted",
      previous_status: "drafted",
      changed_by: user.id,
      change_reason: "Student submitted document to faculty",
    } as any);

    setReviewsBySubmission((prev) => ({
      ...prev,
      [studentDocumentId]: { review_status: "pending" },
    }));

    toast({ title: "Submitted", description: "Your document has been submitted to faculty for review." });
    setSubmittingId(null);
  };

  const inProgress = studentDocs.filter((d) => d.status === "in_progress");
  const completed = studentDocs.filter((d) => d.status === "completed" || d.status === "downloaded");
  const startedTemplateIds = new Set(studentDocs.map((d) => d.source_document_id));
  const newTemplates = availableTemplates.filter((t) => !startedTemplateIds.has(t.id));

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground mt-1">Fill documents and download them instantly</p>
        </div>
      </div>

      {/* Quick Start */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-6 mb-8 border-l-4 border-primary">
        <h2 className="font-display text-xl font-semibold text-foreground mb-1">Fill a new document</h2>
        <p className="text-muted-foreground text-sm mb-4">Select a template uploaded by your faculty and fill your details</p>
        <Button onClick={() => navigate("/student/fill")} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[var(--shadow-orange)]">
          Start Filling <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </motion.div>

      {/* Newly Published Templates */}
      {newTemplates.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">New Templates From Faculty</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {newTemplates.slice(0, 6).map((tpl) => (
              <div key={tpl.id} className="card-surface-hover p-5">
                <h3 className="font-medium text-foreground mb-1">{tpl.template_label || tpl.original_filename || "Template"}</h3>
                <p className="text-xs text-muted-foreground mb-3">{tpl.total_pages || 0} pages</p>
                <p className="text-xs text-muted-foreground mb-3">Uploaded by: {facultyById[tpl.user_id] || "Faculty"}</p>
                <Button size="sm" onClick={() => navigate(`/student/fill/${tpl.id}`)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Fill Now <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">In Progress</h2>
          <div className="grid gap-3 mb-8">
            {inProgress.map((doc) => {
              const source = doc.documents;
              const totalPages = source?.total_pages || 1;
              const pct = ((doc.pages_completed || 0) / totalPages) * 100;
              return (
                <div key={doc.id} className="card-surface-hover p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-foreground">{source?.template_label || source?.original_filename || "Template"}</h3>
                      {source?.department_scope && <Badge variant="outline" className="text-xs mt-1">{source.department_scope}</Badge>}
                    </div>
                    <Button size="sm" onClick={() => navigate(`/student/fill/${doc.source_document_id}`)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      Resume <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={pct} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{doc.pages_completed || 0}/{totalPages} pages</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Recently Completed</h2>
          <div className="grid gap-3">
            {completed.map((doc) => {
              const source = doc.documents;
              const review = reviewsBySubmission[doc.id];
              const isSubmitted = !!review;
              const openCorrections = openCorrectionCountBySubmission[doc.id] || 0;
              return (
                <div key={doc.id} className="card-surface p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-fc-success" />
                    <div>
                      <h3 className="font-medium text-foreground">{source?.template_label || source?.original_filename || "Template"}</h3>
                      <p className="text-xs text-muted-foreground">{doc.completed_at ? new Date(doc.completed_at).toLocaleDateString() : ""}</p>
                      {isSubmitted && (
                        <>
                          <p className="text-xs text-muted-foreground mt-1">
                            {review.reviewed_at
                              ? `Faculty action on ${new Date(review.reviewed_at).toLocaleDateString()}`
                              : "Waiting for faculty action"}
                          </p>
                          {review.review_comment && (
                            <p className="text-xs text-fc-error mt-1">Faculty note: {review.review_comment}</p>
                          )}
                          {openCorrections > 0 && (
                            <p className="text-xs text-fc-warning mt-1">{openCorrections} field(s) need correction</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSubmitted ? (
                      <>
                        <Badge className={
                          review.review_status === "approved"
                            ? "bg-fc-success-bg text-fc-success border border-green-200"
                            : review.review_status === "rejected"
                            ? "bg-fc-error-bg text-fc-error border border-red-200"
                            : "bg-fc-warning-bg text-fc-warning border border-amber-200"
                        }>
                          {review.review_status === "approved" ? "Approved" : review.review_status === "rejected" ? "Changes Requested" : "Submitted"}
                        </Badge>
                        {review.review_status === "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/student/fill/${doc.source_document_id}`)}
                          >
                            Fix & Resubmit
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Badge className="bg-fc-success-bg text-fc-success border border-green-200">Completed</Badge>
                        <Button
                          size="sm"
                          onClick={() => submitToFaculty(doc.id)}
                          disabled={submittingId === doc.id}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          {submittingId === doc.id ? "Submitting..." : "Submit to Faculty"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {studentDocs.length === 0 && newTemplates.length === 0 && (
        <div className="card-surface p-12 text-center">
          <FileEdit className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No documents yet</h3>
          <p className="text-muted-foreground mb-6">Select a template to start filling your first document.</p>
          <Button onClick={() => navigate("/student/fill")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Browse Templates <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
