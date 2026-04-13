import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, Save, CheckCircle, FileText, Clock, Layers, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function CompletionPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [doc, setDoc] = useState<any>(null);
  const [fieldCount, setFieldCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("document_filled.docx");

  useEffect(() => {
    if (!documentId) return;

    const load = async () => {
      const [docRes, fieldsRes] = await Promise.all([
        supabase.from("documents").select("*").eq("id", documentId).single(),
        supabase.from("document_fields").select("id").eq("document_id", documentId),
      ]);
      if (docRes.data) setDoc(docRes.data);
      if (fieldsRes.data) setFieldCount(fieldsRes.data.length);
    };
    load();
  }, [documentId]);

  const handleGenerate = async () => {
    if (!documentId) return;
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-document", {
        body: { documentId },
      });

      if (error) throw new Error(error.message);
      if (data?.downloadUrl) {
        setDownloadUrl(data.downloadUrl);
        setFilename(data.filename || "document_filled.docx");
        toast({ title: "Document ready!", description: "Click Download to save your file." });
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    a.click();
  };

  // Auto-generate on mount
  useEffect(() => {
    if (documentId && !downloadUrl && !generating) {
      handleGenerate();
    }
  }, [documentId]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsla(160,84%,39%,0.05)_0%,_transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="relative z-10 w-full max-w-lg text-center"
      >
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-fc-success/10 border-2 border-fc-success flex items-center justify-center mx-auto mb-6"
        >
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <CheckCircle className="h-10 w-10 text-fc-success" />
          </motion.div>
        </motion.div>

        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          {generating ? "Generating your document..." : "Your document is ready!"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {generating
            ? "Replacing placeholders while preserving formatting..."
            : `All ${doc?.total_pages || 0} pages filled · Formatting preserved · Ready to submit`}
        </p>

        {/* Stats card */}
        <div className="glass-card p-5 mb-6 grid grid-cols-3 gap-4">
          <div className="text-center">
            <Layers className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-semibold text-foreground">{doc?.total_pages || 0}</p>
            <p className="text-xs text-muted-foreground">Pages</p>
          </div>
          <div className="text-center">
            <FileText className="h-5 w-5 text-fc-amber mx-auto mb-1" />
            <p className="text-lg font-semibold text-foreground">{fieldCount}</p>
            <p className="text-xs text-muted-foreground">Fields Filled</p>
          </div>
          <div className="text-center">
            <Clock className="h-5 w-5 text-fc-success mx-auto mb-1" />
            <p className="text-lg font-semibold text-foreground">
              {doc ? Math.max(1, Math.round((Date.now() - new Date(doc.created_at).getTime()) / 60000)) : 0}
            </p>
            <p className="text-xs text-muted-foreground">Minutes</p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-3">
          {generating ? (
            <Button disabled className="flex-1 h-12">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating...
            </Button>
          ) : downloadUrl ? (
            <Button onClick={handleDownload} className="flex-1 bg-primary hover:bg-primary/90 h-12">
              <Download className="h-5 w-5 mr-2" />
              Download .docx
            </Button>
          ) : (
            <Button onClick={handleGenerate} className="flex-1 bg-primary hover:bg-primary/90 h-12">
              <Download className="h-5 w-5 mr-2" />
              Generate & Download
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="flex-1 h-12 border-border"
          >
            <Save className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
