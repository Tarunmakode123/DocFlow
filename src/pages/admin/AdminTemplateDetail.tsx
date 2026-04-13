import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Eye, EyeOff, Trash2, ArrowLeft, Loader2, Users, Save, RotateCcw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Field {
  id: string;
  field_id: string;
  label: string;
  field_type: string;
  global_key: string;
  category: string;
  is_required: boolean;
  page_number: number;
  min_length?: number | null;
  max_length?: number | null;
  validation_pattern?: string | null;
  validation_message?: string | null;
  select_options?: unknown;
}

type TemplateVersion = {
  id: string;
  document_id: string;
  version_number: number;
  action: "manual" | "publish" | "unpublish" | "rollback";
  notes: string | null;
  snapshot: {
    document: Record<string, unknown>;
    fields: Array<Record<string, unknown>>;
  };
  created_at: string;
};

const departments = ["ALL", "CSE", "IT", "ECE", "ME", "CE", "EE"];
const semesters = ["ALL", "1", "2", "3", "4", "5", "6", "7", "8"];

export default function AdminTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doc, setDoc] = useState<any>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [savingFieldId, setSavingFieldId] = useState<string | null>(null);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [versionBusyId, setVersionBusyId] = useState<string | null>(null);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTemplateData = async () => {
    if (!id) return;
    const [docRes, fieldsRes, studentsRes, versionsRes] = await Promise.all([
      supabase.from("documents").select("*").eq("id", id).single(),
      supabase.from("document_fields").select("*").eq("document_id", id).order("page_number").order("order_index"),
      supabase.from("student_documents" as any).select("id", { count: "exact" }).eq("source_document_id", id),
      supabase.from("template_versions" as any).select("*").eq("document_id", id).order("version_number", { ascending: false }),
    ]);

    if (docRes.data) setDoc(docRes.data);
    if (fieldsRes.data) setFields(fieldsRes.data as Field[]);
    setStudentCount((studentsRes as any).count || 0);
    setVersions((((versionsRes as any)?.data || []) as unknown) as TemplateVersion[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    loadTemplateData();
  }, [id]);

  const createSnapshot = async (
    action: "manual" | "publish" | "unpublish" | "rollback",
    notes?: string
  ) => {
    if (!id || !doc) return null;

    const snapshotDoc = {
      template_label: doc.template_label,
      template_description: doc.template_description,
      department_scope: doc.department_scope,
      semester_scope: doc.semester_scope,
      is_published: doc.is_published,
      status: doc.status,
    };

    const snapshotFields = fields.map((f) => ({
      page_number: f.page_number,
      field_id: f.field_id,
      global_key: f.global_key,
      label: f.label,
      field_type: f.field_type,
      is_required: f.is_required,
      order_index: (f as any).order_index ?? null,
      category: f.category,
      detect_hint: (f as any).detect_hint ?? null,
      select_options: (f as any).select_options ?? null,
      min_length: f.min_length ?? null,
      max_length: f.max_length ?? null,
      validation_pattern: f.validation_pattern ?? null,
      validation_message: f.validation_message ?? null,
    }));

    const nextVersion = (versions[0]?.version_number || 0) + 1;
    const payload = {
      document_id: id,
      version_number: nextVersion,
      action,
      notes: notes || null,
      created_by: null,
      snapshot: {
        document: snapshotDoc,
        fields: snapshotFields,
      },
    };

    const { data, error } = await supabase
      .from("template_versions" as any)
      .insert(payload as any)
      .select("*")
      .single();

    if (error) {
      toast({ title: "Snapshot failed", description: error.message, variant: "destructive" });
      return null;
    }

    setVersions((prev) => [(((data || payload) as unknown) as TemplateVersion), ...prev]);
    return data;
  };

  const handleManualSnapshot = async () => {
    setSnapshotSaving(true);
    const note = window.prompt("Optional note for this snapshot:", "Before major template edits") || undefined;
    const result = await createSnapshot("manual", note);
    if (result) toast({ title: `Snapshot v${(result as any).version_number} saved` });
    setSnapshotSaving(false);
  };

  const togglePublish = async () => {
    if (!id || !doc) return;
    const newPublished = !doc.is_published;
    await createSnapshot(newPublished ? "publish" : "unpublish", newPublished ? "Published template" : "Unpublished template");
    await supabase.from("documents").update({
      is_published: newPublished,
      published_at: newPublished ? new Date().toISOString() : null,
      status: newPublished ? "completed" : "analyzed",
    } as any).eq("id", id);
    setDoc({ ...doc, is_published: newPublished });
    toast({ title: newPublished ? "Template published" : "Template unpublished" });
  };

  const rollbackToVersion = async (version: TemplateVersion) => {
    if (!id || !doc) return;
    const confirm = window.confirm(`Rollback to version v${version.version_number}? Current rules and metadata will be replaced.`);
    if (!confirm) return;

    setVersionBusyId(version.id);

    const snapshot = version.snapshot;
    const snapshotDoc = snapshot?.document || {};
    const snapshotFields = Array.isArray(snapshot?.fields) ? snapshot.fields : [];

    const { error: docError } = await supabase
      .from("documents")
      .update({
        template_label: snapshotDoc.template_label ?? doc.template_label,
        template_description: snapshotDoc.template_description ?? doc.template_description,
        department_scope: snapshotDoc.department_scope ?? doc.department_scope,
        semester_scope: snapshotDoc.semester_scope ?? doc.semester_scope,
        is_published: snapshotDoc.is_published ?? doc.is_published,
        status: snapshotDoc.status ?? doc.status,
      } as any)
      .eq("id", id);

    if (docError) {
      toast({ title: "Rollback failed", description: docError.message, variant: "destructive" });
      setVersionBusyId(null);
      return;
    }

    const { error: deleteFieldsError } = await supabase.from("document_fields").delete().eq("document_id", id);
    if (deleteFieldsError) {
      toast({ title: "Rollback failed", description: deleteFieldsError.message, variant: "destructive" });
      setVersionBusyId(null);
      return;
    }

    if (snapshotFields.length > 0) {
      const rows = snapshotFields.map((f: any) => ({
        document_id: id,
        page_number: f.page_number,
        field_id: f.field_id,
        global_key: f.global_key,
        label: f.label,
        field_type: f.field_type,
        is_required: f.is_required,
        order_index: f.order_index,
        category: f.category,
        detect_hint: f.detect_hint,
        select_options: f.select_options,
        min_length: f.min_length,
        max_length: f.max_length,
        validation_pattern: f.validation_pattern,
        validation_message: f.validation_message,
      }));

      const { error: insertFieldsError } = await supabase.from("document_fields").insert(rows as any);
      if (insertFieldsError) {
        toast({ title: "Rollback failed", description: insertFieldsError.message, variant: "destructive" });
        setVersionBusyId(null);
        return;
      }
    }

    await createSnapshot("rollback", `Rolled back to v${version.version_number}`);
    await loadTemplateData();
    toast({ title: `Rolled back to version v${version.version_number}` });
    setVersionBusyId(null);
  };

  const deleteTemplate = async () => {
    if (!id) return;
    await supabase.from("documents").delete().eq("id", id);
    toast({ title: "Template deleted" });
    navigate("/admin/templates");
  };

  const updateTemplateScope = async (patch: Record<string, string | null>) => {
    if (!id || !doc) return;
    const { error } = await supabase.from("documents").update(patch as any).eq("id", id);
    if (error) {
      toast({ title: "Failed to update scope", description: error.message, variant: "destructive" });
      return;
    }
    setDoc({ ...doc, ...patch });
    toast({ title: "Template scope updated" });
  };

  const parseOptions = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  };

  const updateFieldRule = async (fieldId: string, patch: Record<string, unknown>) => {
    setSavingFieldId(fieldId);
    const { error } = await supabase
      .from("document_fields")
      .update(patch as any)
      .eq("id", fieldId);

    if (error) {
      toast({ title: "Failed to save rule", description: error.message, variant: "destructive" });
      setSavingFieldId(null);
      return;
    }

    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, ...(patch as Partial<Field>) } : f)));
    setSavingFieldId(null);
  };

  // Group fields by page
  const pageGroups = fields.reduce<Record<number, Field[]>>((acc, f) => {
    if (!acc[f.page_number]) acc[f.page_number] = [];
    acc[f.page_number].push(f);
    return acc;
  }, {});

  const categoryColors: Record<string, string> = {
    personal: "bg-blue-50 text-blue-700",
    academic: "bg-purple-50 text-purple-700",
    project: "bg-green-50 text-green-700",
    faculty: "bg-amber-50 text-amber-700",
    institution: "bg-pink-50 text-pink-700",
    date: "bg-orange-50 text-orange-700",
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!doc) return <div className="p-6 text-center text-muted-foreground">Template not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/admin/templates")} className="mb-4 text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Templates
      </Button>

      <div className="card-surface p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{doc.template_label || doc.original_filename}</h1>
            {doc.template_description && <p className="text-muted-foreground mt-1">{doc.template_description}</p>}
            <div className="flex items-center gap-2 mt-3">
              {doc.department_scope && <Badge variant="outline">{doc.department_scope}</Badge>}
              {doc.semester_scope && <Badge variant="outline">Sem {doc.semester_scope}</Badge>}
              <Badge variant="outline">{doc.total_pages || 0} pages</Badge>
              <Badge variant="outline">{fields.length} fields</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleManualSnapshot} disabled={snapshotSaving} className="border-border">
              {snapshotSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save Snapshot
            </Button>
            <Button variant="outline" onClick={togglePublish} className="border-border">
              {doc.is_published ? <><EyeOff className="h-4 w-4 mr-1" /> Unpublish</> : <><Eye className="h-4 w-4 mr-1" /> Publish</>}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete template?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete this template and all student responses.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteTemplate} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{studentCount} students used</span>
          </div>
          <div className="text-sm text-muted-foreground">{doc.download_count || 0} downloads</div>
        </div>

        <div className="mt-4 pt-4 border-t border-border grid md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Department Scope</Label>
            <Select
              value={doc.department_scope || "ALL"}
              onValueChange={(value) => updateTemplateScope({ department_scope: value === "ALL" ? "ALL" : value })}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Semester Scope</Label>
            <Select
              value={doc.semester_scope || "ALL"}
              onValueChange={(value) => updateTemplateScope({ semester_scope: value === "ALL" ? "ALL" : value })}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {semesters.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "ALL" ? "ALL" : `Semester ${s}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Submission Deadline</Label>
            <Input
              type="date"
              value={doc.deadline ? doc.deadline : ""}
              onChange={(e) => updateTemplateScope({ deadline: e.target.value || null })}
              className="bg-background border-border"
            />
          </div>
        </div>
      </div>

      <div className="card-surface p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold text-foreground">Version History</h2>
        </div>

        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No snapshots yet. Use "Save Snapshot" before major edits.</p>
        ) : (
          <div className="space-y-2">
            {versions.map((v) => (
              <div key={v.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">v{v.version_number}</Badge>
                    <Badge className="bg-muted text-muted-foreground capitalize">{v.action}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(v.created_at).toLocaleString()}</p>
                  {v.notes && <p className="text-sm text-foreground mt-1">{v.notes}</p>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border"
                  disabled={versionBusyId === v.id}
                  onClick={() => rollbackToVersion(v)}
                >
                  {versionBusyId === v.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                  Rollback
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Review */}
      <h2 className="font-display text-lg font-semibold text-foreground mb-4">Detected Fields by Page</h2>

      <div className="card-surface p-4 mb-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
          {Object.entries(
            fields.reduce<Record<string, number>>((acc, f) => {
              const cat = f.category || "other";
              acc[cat] = (acc[cat] || 0) + 1;
              return acc;
            }, {})
          ).map(([cat, count]) => (
            <div key={cat}>
              <p className="text-lg font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground capitalize">{cat}</p>
            </div>
          ))}
        </div>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {Object.entries(pageGroups).map(([pageNum, pageFields]) => (
          <AccordionItem key={pageNum} value={`page-${pageNum}`} className="card-surface px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Page {pageNum}</span>
                <Badge variant="outline" className="text-xs">{pageFields.length} fields</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-2">
                {pageFields.map((f) => (
                  <div key={f.id} className="p-3 rounded-lg bg-background border border-border/60 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-foreground flex-1 min-w-[220px]">{f.label}</span>
                      <Badge variant="outline" className="text-xs font-mono">{f.field_type}</Badge>
                      <Badge className={`text-xs ${categoryColors[f.category] || "bg-muted text-muted-foreground"}`}>{f.category}</Badge>
                      {savingFieldId === f.id && <span className="text-xs text-muted-foreground">Saving...</span>}
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                        <Label className="text-xs text-muted-foreground">Required field</Label>
                        <Switch
                          checked={!!f.is_required}
                          onCheckedChange={(checked) => updateFieldRule(f.id, { is_required: checked })}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Regex Pattern (optional)</Label>
                        <Input
                          defaultValue={f.validation_pattern || ""}
                          placeholder="e.g. ^[A-Z]{2}[0-9]{2}$"
                          className="h-8"
                          onBlur={(e) => updateFieldRule(f.id, { validation_pattern: e.target.value.trim() || null })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Min Length</Label>
                          <Input
                            type="number"
                            min={0}
                            defaultValue={f.min_length ?? ""}
                            className="h-8"
                            onBlur={(e) => {
                              const next = e.target.value ? Number(e.target.value) : null;
                              updateFieldRule(f.id, { min_length: Number.isNaN(next) ? null : next });
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Max Length</Label>
                          <Input
                            type="number"
                            min={0}
                            defaultValue={f.max_length ?? ""}
                            className="h-8"
                            onBlur={(e) => {
                              const next = e.target.value ? Number(e.target.value) : null;
                              updateFieldRule(f.id, { max_length: Number.isNaN(next) ? null : next });
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Validation Message (optional)</Label>
                        <Input
                          defaultValue={f.validation_message || ""}
                          placeholder="Shown to student when validation fails"
                          className="h-8"
                          onBlur={(e) => updateFieldRule(f.id, { validation_message: e.target.value.trim() || null })}
                        />
                      </div>
                    </div>

                    {f.field_type === "select" && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Allowed Options (comma-separated)</Label>
                        <Textarea
                          defaultValue={parseOptions(f.select_options).join(", ")}
                          placeholder="e.g. CSE, IT, ECE"
                          className="min-h-16"
                          onBlur={(e) => {
                            const options = e.target.value
                              .split(",")
                              .map((v) => v.trim())
                              .filter(Boolean);
                            updateFieldRule(f.id, { select_options: options.length ? options : null });
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {fields.length === 0 && (
        <div className="card-surface p-8 text-center">
          <p className="text-muted-foreground">No fields detected. The analysis may still be in progress.</p>
        </div>
      )}
    </div>
  );
}
