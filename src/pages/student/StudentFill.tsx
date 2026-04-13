import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, ArrowRight, Loader2, Search, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const departments = ["ALL", "CSE", "IT", "ECE", "ME", "CE", "EE"];

const matchesScope = (template: any, department?: string | null, semester?: string | null) => {
  const normalize = (value?: string | null) => (value || "").trim().toUpperCase();
  const deptScope = normalize(template.department_scope);
  const semScope = normalize(template.semester_scope);
  const deptValue = normalize(department);
  const semValue = normalize(semester);

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

export default function StudentFill() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [facultyById, setFacultyById] = useState<Record<string, string>>({});
  const [studentDocs, setStudentDocs] = useState<Record<string, any>>({});
  const [fieldCounts, setFieldCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState(profile?.department || "ALL");
  const [semFilter, setSemFilter] = useState(profile?.semester || "ALL");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Fetch published templates
      const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (docs) {
        setTemplates(docs);

        const facultyIds = Array.from(new Set(docs.map((d: any) => d.user_id).filter(Boolean)));
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

        // Fetch field counts for each template
        const counts: Record<string, number> = {};
        for (const doc of docs) {
          const { count } = await supabase
            .from("document_fields")
            .select("id", { count: "exact", head: true })
            .eq("document_id", doc.id);
          counts[doc.id] = count || 0;
        }
        setFieldCounts(counts);
      }

      // Fetch student's existing documents
      const { data: sDocs } = await supabase
        .from("student_documents" as any)
        .select("*")
        .eq("student_id", user.id);

      if (sDocs) {
        const map: Record<string, any> = {};
        sDocs.forEach((d: any) => { map[d.source_document_id] = d; });
        setStudentDocs(map);
      }

      setLoading(false);
    };
    load();
  }, [user]);

  const eligibleTemplates = useMemo(
    () => templates.filter((t) => matchesScope(t, profile?.department, profile?.semester)),
    [templates, profile?.department, profile?.semester]
  );

  const filtered = useMemo(
    () =>
      eligibleTemplates.filter((t) => {
        if (deptFilter !== "ALL" && t.department_scope && t.department_scope !== "ALL" && t.department_scope !== deptFilter) return false;
        if (semFilter !== "ALL" && t.semester_scope && t.semester_scope !== "ALL" && t.semester_scope !== semFilter) return false;
        return true;
      }),
    [eligibleTemplates, deptFilter, semFilter]
  );

  const deptBadgeColors: Record<string, string> = {
    CSE: "bg-blue-50 text-blue-700",
    IT: "bg-purple-50 text-purple-700",
    ECE: "bg-green-50 text-green-700",
    ME: "bg-red-50 text-red-700",
    CE: "bg-teal-50 text-teal-700",
    EE: "bg-yellow-50 text-yellow-700",
    ALL: "bg-muted text-muted-foreground",
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-1">Select Your Document Template</h1>
        <p className="text-muted-foreground">Choose the template your faculty has uploaded</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[140px] bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d === "ALL" ? "All Depts" : d}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={semFilter} onValueChange={setSemFilter}>
          <SelectTrigger className="w-[140px] bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Semesters</SelectItem>
            {["1","2","3","4","5","6","7","8"].map((s) => <SelectItem key={s} value={s}>Semester {s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="card-surface p-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No templates available</h3>
          <p className="text-muted-foreground">No templates match your profile scope right now. Ask your faculty to publish one for your department/semester.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t, i) => {
            const sd = studentDocs[t.id];
            const isCompleted = sd?.status === "completed" || sd?.status === "downloaded";
            const isInProgress = sd?.status === "in_progress";
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-surface-hover p-5 flex flex-col"
              >
                <div className="flex-1">
                  <h3 className="font-display text-base font-semibold text-foreground mb-1">{t.template_label || t.original_filename}</h3>
                  {t.template_description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{t.template_description}</p>}
                  <p className="text-xs text-muted-foreground mb-2">Uploaded by: {facultyById[t.user_id] || "Faculty"}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {t.department_scope && <Badge className={`text-xs ${deptBadgeColors[t.department_scope] || deptBadgeColors.ALL}`}>{t.department_scope}</Badge>}
                    {t.semester_scope && <Badge className="text-xs bg-fc-orange-50 text-fc-orange-700">Sem {t.semester_scope}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.total_pages || 0} pages · {fieldCounts[t.id] || 0} fields
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border">
                  {isCompleted ? (
                    <div className="flex items-center justify-between">
                      <Badge className="bg-fc-success-bg text-fc-success border border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/student/fill/${t.id}`)} className="text-xs">Re-download</Button>
                    </div>
                  ) : isInProgress ? (
                    <div className="flex items-center justify-between">
                      <Badge className="bg-fc-warning-bg text-fc-warning border border-amber-200"><Clock className="h-3 w-3 mr-1" />{sd.pages_completed}/{t.total_pages || "?"} pages</Badge>
                      <Button size="sm" onClick={() => navigate(`/student/fill/${t.id}`)} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs">
                        Resume <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => navigate(`/student/fill/${t.id}`)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[var(--shadow-orange)]">
                      Fill This Template <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
