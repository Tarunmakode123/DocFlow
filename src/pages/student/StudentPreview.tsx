import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, Pencil, Loader2, ChevronLeft, ChevronRight, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import SubmissionTimeline from "@/components/SubmissionTimeline";
import confetti from "canvas-confetti";
import mammoth from "mammoth";

const STATUS_MESSAGES = [
  "Applying your details...",
  "Inserting images...",
  "Creating preview...",
];

export default function StudentPreview() {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const isRegenerate = searchParams.get("regenerate") === "true";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [generating, setGenerating] = useState(true);
  const [statusIdx, setStatusIdx] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState("document_filled.docx");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [studentDocumentId, setStudentDocumentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "timeline">("preview");
  const statusInterval = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!templateId || !user) return;

    // Cycle status messages
    statusInterval.current = setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 3000);

    const generate = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-document", {
          body: { documentId: templateId },
        });
        if (error) throw new Error(error.message);
        if (!data?.downloadUrl) throw new Error("No download URL returned");

        setDownloadUrl(data.downloadUrl);
        setDownloadFilename(data.filename || "document_filled.docx");

        // Fetch the docx and render with mammoth
        const resp = await fetch(data.downloadUrl);
        const arrayBuffer = await resp.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setPreviewHtml(result.value);
      } catch (err: any) {
        toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      } finally {
        setGenerating(false);
        if (statusInterval.current) clearInterval(statusInterval.current);
      }
    };

    generate();

    return () => {
      if (statusInterval.current) clearInterval(statusInterval.current);
    };
  }, [templateId, user]);

  useEffect(() => {
    if (!templateId || !user) return;

    const fetchStudentDocId = async () => {
      const { data } = await supabase
        .from("student_documents" as any)
        .select("id")
        .eq("student_id", user.id)
        .eq("source_document_id", templateId)
        .single();

      if (data) {
        setStudentDocumentId(data.id);
      }
    };

    fetchStudentDocId();
  }, [templateId, user]);

  const handleDownload = async () => {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = downloadFilename;
    a.click();

    if (!downloaded) {
      setDownloaded(true);
      confetti({ particleCount: 100, spread: 70, colors: ["#F97316", "#FB923C", "#FDBA74", "#FED7AA", "#D97706"] });

      // Update student_document status
      if (user && templateId) {
        await supabase
          .from("student_documents" as any)
          .update({ status: "downloaded", downloaded_at: new Date().toISOString() })
          .eq("student_id", user.id)
          .eq("source_document_id", templateId);
      }
    }
  };

  const handleEditDetails = () => {
    navigate(`/student/fill/${templateId}?fromPreview=true`);
  };

  // Generating state
  if (generating) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="card-surface p-10 rounded-2xl">
            <FileText className="h-12 w-12 text-primary mx-auto mb-6 opacity-80" />

            {/* Orange progress ring */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <svg className="w-20 h-20 animate-spin" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="6"
                  strokeDasharray="160" strokeDashoffset="80"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              Generating your document...
            </h2>
            <motion.p
              key={statusIdx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-muted-foreground text-sm mb-4"
            >
              {STATUS_MESSAGES[statusIdx]}
            </motion.p>
            <p className="text-xs text-muted-foreground/60">This usually takes 10-15 seconds</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="border-b border-border px-4 md:px-6 py-3 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="font-display text-lg font-semibold text-foreground">Document Preview</h1>
        </div>
        {downloaded && (
          <Badge className="bg-fc-success-bg text-fc-success border border-green-200 text-xs">
            Downloaded ✓
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-4 md:px-6 bg-card shrink-0 flex items-center gap-6">
        <button
          onClick={() => setActiveTab("preview")}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "preview"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Preview
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "timeline"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Review Timeline
        </button>
      </div>

      {/* Disclaimer banner - Preview tab only */}
      {activeTab === "preview" && (
        <div className="bg-accent border-b border-border px-4 md:px-6 py-2 flex items-center gap-2 shrink-0">
          <AlertTriangle className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            This is an approximate preview. Your downloaded file will match your faculty's exact formatting.
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
        <div className="max-w-4xl mx-auto">
          {activeTab === "preview" ? (
            previewHtml ? (
              <div className="card-surface p-8 md:p-12 rounded-xl shadow-sm">
                <div
                  className="docflow-preview prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            ) : (
              <div className="card-surface p-12 text-center rounded-xl">
                <p className="text-muted-foreground">Preview could not be generated. You can still download your document.</p>
              </div>
            )
          ) : studentDocumentId ? (
            <div className="card-surface p-6 md:p-8 rounded-xl shadow-sm">
              <h2 className="font-display text-xl font-semibold text-foreground mb-6">Submission Timeline</h2>
              <SubmissionTimeline studentDocumentId={studentDocumentId} />
            </div>
          ) : (
            <div className="card-surface p-12 text-center rounded-xl">
              <p className="text-muted-foreground">Timeline data not available</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="border-t border-border px-4 md:px-6 py-4 bg-card shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          <Button
            onClick={handleDownload}
            disabled={!downloadUrl}
            className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[var(--shadow-orange)] text-base"
          >
            <Download className="h-5 w-5 mr-2" />
            Download .docx
          </Button>
          <Button
            variant="outline"
            onClick={handleEditDetails}
            className="h-12 px-8 border-border text-base"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit My Details
          </Button>
        </div>
      </div>
    </div>
  );
}
