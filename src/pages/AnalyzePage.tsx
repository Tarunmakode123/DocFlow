import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const statusMessages = [
  "Reading document structure...",
  "Detecting placeholder fields...",
  "Mapping page layout...",
  "Building your form...",
];

export default function AnalyzePage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [status, setStatus] = useState<"analyzing" | "done" | "error">("analyzing");
  const [error, setError] = useState("");

  useEffect(() => {
    // Rotate status messages
    const msgInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % statusMessages.length);
    }, 2500);

    // Simulate progress
    const progInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 8, 92));
    }, 500);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progInterval);
    };
  }, []);

  useEffect(() => {
    if (!documentId) return;

    const analyze = async () => {
      try {
        // Get document info
        const { data: doc } = await supabase
          .from("documents")
          .select("*")
          .eq("id", documentId)
          .single();

        if (!doc) throw new Error("Document not found");

        // Download the file
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("document-templates")
          .download(doc.storage_path);

        if (downloadError || !fileData) throw new Error("Failed to download file");

        // Parse with mammoth (loaded dynamically)
        const mammoth = await import("mammoth");
        const arrayBuffer = await fileData.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const fullText = result.value;

        // Split into pages (rough heuristic: split by form feed or every ~3000 chars)
        const pages = fullText.includes("\f")
          ? fullText.split("\f").filter((p: string) => p.trim().length > 0)
          : splitByLength(fullText, 3000);

        // Call the analysis edge function
        const { data: analysisResult, error: fnError } = await supabase.functions.invoke(
          "analyze-document",
          {
            body: { documentId, pageTexts: pages },
          }
        );

        if (fnError) throw new Error(fnError.message);

        setProgress(100);
        setStatus("done");

        // Wait briefly then navigate
        setTimeout(() => {
          navigate(`/document/${documentId}/fill`);
        }, 1500);
      } catch (err: any) {
        console.error("Analysis error:", err);
        setStatus("error");
        setError(err.message);
        toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
      }
    };

    analyze();
  }, [documentId]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsla(217,91%,60%,0.05)_0%,_transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg text-center"
      >
        {/* Document card with laser sweep */}
        <div className="glass-card p-8 mb-8 relative overflow-hidden mx-auto max-w-xs">
          <div className="aspect-[1/1.414] bg-secondary/30 rounded-lg relative overflow-hidden flex items-center justify-center">
            <FileText className="h-16 w-16 text-muted-foreground/30" />

            {status === "analyzing" && (
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
                animate={{ top: ["0%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            {status === "done" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-fc-success/10"
              >
                <CheckCircle className="h-16 w-16 text-fc-success" />
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-destructive/10"
              >
                <AlertCircle className="h-16 w-16 text-destructive" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs mx-auto mb-6">
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-fc-glow rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-mono">{Math.round(progress)}%</p>
        </div>

        {/* Status messages */}
        <AnimatePresence mode="wait">
          <motion.p
            key={status === "error" ? "error" : currentMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-muted-foreground"
          >
            {status === "error"
              ? error || "Something went wrong. Please try again."
              : status === "done"
              ? "Analysis complete! Redirecting..."
              : statusMessages[currentMessage]}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function splitByLength(text: string, maxLength: number): string[] {
  const pages: string[] = [];
  for (let i = 0; i < text.length; i += maxLength) {
    const chunk = text.slice(i, i + maxLength);
    if (chunk.trim()) pages.push(chunk);
  }
  return pages.length > 0 ? pages : [text];
}
