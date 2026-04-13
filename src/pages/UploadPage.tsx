import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const validateFile = (f: File): string | null => {
    if (!f.name.endsWith(".docx")) return "Only .docx files are supported.";
    if (f.size > 10 * 1024 * 1024) return "File must be under 10MB.";
    return null;
  };

  const handleFile = (f: File) => {
    const error = validateFile(f);
    if (error) {
      toast({ title: "Invalid file", description: error, variant: "destructive" });
      return;
    }
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);

    try {
      // Create document record
      const { data: doc, error: dbError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          original_filename: file.name,
          storage_path: "",
          status: "uploading" as const,
        })
        .select()
        .single();

      if (dbError || !doc) throw dbError || new Error("Failed to create document");

      // Upload to storage
      const storagePath = `${user.id}/${doc.id}/original.docx`;
      const { error: uploadError } = await supabase.storage
        .from("document-templates")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Update storage path
      await supabase
        .from("documents")
        .update({ storage_path: storagePath, status: "analyzing" as const })
        .eq("id", doc.id);

      navigate(`/document/${doc.id}/analyze`);
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsla(217,91%,60%,0.05)_0%,_transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Upload Document</h1>
          <p className="text-muted-foreground">Upload your faculty's .docx template to get started</p>
        </div>

        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => inputRef.current?.click()}
                className={`relative cursor-pointer rounded-2xl p-16 text-center transition-all duration-300
                  ${isDragging
                    ? "border-2 border-primary bg-primary/5"
                    : "border-2 border-dashed border-border hover:border-primary/50"
                  }`}
                style={isDragging ? { boxShadow: "0 0 40px hsla(217,91%,60%,0.2)" } : {}}
              >
                {/* Animated border SVG */}
                {isDragging && (
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <rect
                        x="1" y="1"
                        width="calc(100% - 2px)" height="calc(100% - 2px)"
                        rx="16" ry="16"
                        fill="none"
                        stroke="hsl(217,91%,60%)"
                        strokeWidth="2"
                        strokeDasharray="10 5"
                        className="animate-dash-chase"
                      />
                    </svg>
                  </div>
                )}

                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-colors
                  ${isDragging ? "bg-primary/20" : "bg-secondary"}`}>
                  <Upload className={`h-7 w-7 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                </div>

                <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                  {isDragging ? "Drop your file here" : "Drag & drop your .docx file"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                <p className="text-xs text-muted-foreground">
                  Supports .docx files up to 10MB · Faculty templates only
                </p>

                <input
                  ref={inputRef}
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{file.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setFile(null)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-primary hover:bg-primary/90 h-12 text-base"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Analyze with AI
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
