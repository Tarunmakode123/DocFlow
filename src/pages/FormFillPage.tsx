import { memo, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Save, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
}

const FieldInput = memo(function FieldInput({
  field,
  value,
  onCommit,
}: {
  field: DocumentField;
  value: string;
  onCommit: (fieldId: string, globalKey: string, value: string) => void;
}) {
  const [draftValue, setDraftValue] = useState(value);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const commitValue = useCallback(
    (nextValue: string) => {
      onCommit(field.field_id, field.global_key, nextValue);
    },
    [field.field_id, field.global_key, onCommit]
  );

  const handleChange = (nextValue: string) => {
    setDraftValue(nextValue);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      commitValue(nextValue);
    }, 500);
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    commitValue(draftValue);
  };

  const commonProps = {
    value: draftValue,
    onBlur: handleBlur,
    placeholder: field.detect_hint || `Enter ${field.label.toLowerCase()}`,
    className: "bg-secondary/50 border-border glow-border-focus",
  };

  if (field.field_type === "textarea") {
    return (
      <Textarea
        {...commonProps}
        onChange={(e) => handleChange(e.target.value)}
      />
    );
  }

  if (field.field_type === "date") {
    return (
      <Input
        type="date"
        value={draftValue}
        onBlur={handleBlur}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-secondary/50 border-border glow-border-focus"
      />
    );
  }

  if (field.field_type === "number") {
    return (
      <Input
        {...commonProps}
        type="number"
        onChange={(e) => handleChange(e.target.value)}
      />
    );
  }

  return (
    <Input
      {...commonProps}
      type="text"
      onChange={(e) => handleChange(e.target.value)}
    />
  );
});

export default function FormFillPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [fields, setFields] = useState<DocumentField[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageTexts, setPageTexts] = useState<Record<number, string>>({});

  // Load fields and existing responses
  useEffect(() => {
    if (!documentId || !user) return;

    const loadData = async () => {
      const [fieldsResult, responsesResult, docResult] = await Promise.all([
        supabase
          .from("document_fields")
          .select("*")
          .eq("document_id", documentId)
          .order("page_number")
          .order("order_index"),
        supabase
          .from("field_responses")
          .select("*")
          .eq("document_id", documentId)
          .eq("user_id", user.id),
        supabase
          .from("documents")
          .select("total_pages")
          .eq("id", documentId)
          .single(),
      ]);

      if (fieldsResult.data) {
        setFields(fieldsResult.data as DocumentField[]);
        const maxPage = Math.max(...fieldsResult.data.map((f: any) => f.page_number), 1);
        setTotalPages(docResult.data?.total_pages || maxPage);
      }

      if (responsesResult.data) {
        const resMap: Record<string, string> = {};
        responsesResult.data.forEach((r: any) => {
          resMap[r.field_id] = r.value || "";
        });
        setResponses(resMap);
      }

      setLoading(false);
    };

    loadData();
  }, [documentId, user]);

  // Fields for current page
  const currentFields = useMemo(
    () => fields.filter((f) => f.page_number === currentPage),
    [fields, currentPage]
  );

  // Global field map for auto-fill
  const globalFieldMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    fields.forEach((f) => {
      if (!map[f.global_key]) map[f.global_key] = [];
      map[f.global_key].push(f.field_id);
    });
    return map;
  }, [fields]);

  // Find which page a globalKey first appeared on
  const firstPageForGlobalKey = useMemo(() => {
    const map: Record<string, number> = {};
    fields.forEach((f) => {
      if (!map[f.global_key] || f.page_number < map[f.global_key]) {
        map[f.global_key] = f.page_number;
      }
    });
    return map;
  }, [fields]);

  // Save responses to DB
  const saveResponse = useCallback(
    async (fieldId: string, globalKey: string, value: string) => {
      if (!documentId || !user) return;

      const fieldIds = globalFieldMap[globalKey] || [fieldId];

      setResponses((prev) => {
        const updated = { ...prev };
        fieldIds.forEach((fid) => {
          updated[fid] = value;
        });
        return updated;
      });

      setSaving(true);
      setSaved(false);

      const upserts = fieldIds.map((fid) => ({
        document_id: documentId,
        field_id: fid,
        global_key: globalKey,
        user_id: user.id,
        value,
      }));

      for (const upsert of upserts) {
        await supabase.from("field_responses").upsert(upsert, {
          onConflict: "document_id,field_id,user_id",
        });
      }

      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    [documentId, user, globalFieldMap]
  );

  const completedPages = useMemo(() => {
    const pageCompletion = new Set<number>();
    for (let p = 1; p <= totalPages; p++) {
      const pageFields = fields.filter((f) => f.page_number === p);
      const required = pageFields.filter((f) => f.is_required);
      if (required.length === 0 || required.every((f) => responses[f.field_id]?.trim())) {
        pageCompletion.add(p);
      }
    }
    return pageCompletion;
  }, [fields, responses, totalPages]);

  const handleComplete = async () => {
    if (!documentId) return;
    await supabase
      .from("documents")
      .update({ status: "completed" as const, pages_completed: totalPages })
      .eq("id", documentId);
    navigate(`/document/${documentId}/complete`);
  };

  const isLastPage = currentPage === totalPages;
  const progressPercent = (completedPages.size / totalPages) * 100;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top progress bar */}
      <div className="h-1 bg-secondary">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-fc-glow"
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Split pane */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Page preview */}
        <div className="w-full md:w-2/5 p-4 md:p-6 border-b md:border-b-0 md:border-r border-border overflow-auto">
          <div className="glass-card p-6 aspect-[1/1.414] relative">
            <div className="text-xs text-muted-foreground mb-3 font-mono">Page {currentPage}</div>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              {currentFields.length === 0 ? (
                <p className="text-center text-muted-foreground/50 mt-8">
                  No fields detected on this page
                </p>
              ) : (
                currentFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <span className="text-foreground/70">{field.label}:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs transition-colors ${
                        responses[field.field_id]
                          ? "bg-fc-success/15 text-fc-success border border-fc-success/20"
                          : "bg-fc-amber/15 text-fc-amber border-b-2 border-fc-amber"
                      }`}
                    >
                      {responses[field.field_id] || field.detect_hint || "___________"}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Page number badge */}
            <div className="absolute bottom-3 right-3">
              <Badge variant="outline" className="text-xs font-mono">
                {currentPage}/{totalPages}
              </Badge>
            </div>
          </div>
        </div>

        {/* Right: Form fields */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Page {currentPage} Fields
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  {saved && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-fc-success"
                    >
                      <Check className="h-3 w-3" /> Saved
                    </motion.span>
                  )}
                </div>
              </div>

              {currentFields.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-muted-foreground">
                    No fields detected on this page. Nothing to fill.
                  </p>
                </div>
              ) : (
                currentFields.map((field) => {
                  const isAutoFilled =
                    firstPageForGlobalKey[field.global_key] !== currentPage &&
                    responses[field.field_id];

                  return (
                    <div
                      key={field.id}
                      className="border-l-2 border-primary/30 pl-4 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        {field.is_required && (
                          <span className="text-destructive text-lg leading-none">·</span>
                        )}
                        <Label className="text-sm text-foreground">{field.label}</Label>
                        {isAutoFilled && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono text-primary border-primary/30"
                          >
                            Auto-filled from Page {firstPageForGlobalKey[field.global_key]}
                          </Badge>
                        )}
                      </div>

                      <FieldInput
                        field={field}
                        value={responses[field.field_id] || ""}
                        onCommit={saveResponse}
                      />
                    </div>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-border px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
        <Button
          variant="outline"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="border-border"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <span className="text-sm text-muted-foreground font-mono">
          Page {currentPage} of {totalPages}
        </span>

        {isLastPage ? (
          <Button onClick={handleComplete} className="bg-fc-success hover:bg-fc-success/90">
            <Check className="h-4 w-4 mr-1" />
            Complete
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="bg-primary hover:bg-primary/90"
          >
            Save & Continue
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
