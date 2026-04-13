import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, Loader2, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const departments = ["CSE", "IT", "ECE", "ME", "CE", "EE", "ALL"];
const semesters = ["1", "2", "3", "4", "5", "6", "7", "8", "ALL"];

type Step = "upload" | "metadata" | "analyzing" | "done" | "error";

const statusMessages = [
  "Reading document structure...",
  "Detecting placeholder fields...",
  "Mapping page layout...",
  "Caching results for instant student access...",
];

export default function AdminUpload() {
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [templateLabel, setTemplateLabel] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [autoPublish, setAutoPublish] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [error, setError] = useState("");
  const [docId, setDocId] = useState("");
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
    const err = validateFile(f);
    if (err) {
      toast({ title: "Invalid file", description: err, variant: "destructive" });
      return;
    }
    setFile(f);
    setStep("metadata");
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const startAnalysis = async () => {
    if (!file || !user) return;
    setStep("analyzing");
    setUploading(true);

    // Start message rotation
    const msgInterval = setInterval(() => setCurrentMessage((prev) => (prev + 1) % statusMessages.length), 2500);
    const progInterval = setInterval(() => setProgress((prev) => Math.min(prev + Math.random() * 8, 92)), 500);

    try {
      // Create document record
      const { data: doc, error: dbError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          original_filename: file.name,
          storage_path: "",
          status: "analyzing",
          uploaded_by_role: "admin",
          template_label: templateLabel || file.name.replace(".docx", ""),
          template_description: description || null,
          department_scope: department || null,
          semester_scope: semester || null,
        } as any)
        .select()
        .single();

      if (dbError || !doc) throw dbError || new Error("Failed to create document");
      setDocId(doc.id);

      // Upload to storage
      const storagePath = `${user.id}/${doc.id}/original.docx`;
      const { error: uploadError } = await supabase.storage
        .from("document-templates")
        .upload(storagePath, file);
      if (uploadError) throw uploadError;

      await supabase.from("documents").update({ storage_path: storagePath } as any).eq("id", doc.id);

      // Parse with mammoth
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const fullText = result.value;

      const pages = fullText.includes("\f")
        ? fullText.split("\f").filter((p: string) => p.trim().length > 0)
        : splitByLength(fullText, 3000);

      // Call analysis edge function
      const { data: analysisResult, error: fnError } = await supabase.functions.invoke(
        "analyze-document",
        { body: { documentId: doc.id, pageTexts: pages } }
      );

      if (fnError) throw new Error(fnError.message);

      // Auto-publish if enabled
      if (autoPublish) {
        await supabase
          .from("documents")
          .update({ is_published: true, published_at: new Date().toISOString(), status: "completed" } as any)
          .eq("id", doc.id);
      } else {
        await supabase.from("documents").update({ status: "analyzed" } as any).eq("id", doc.id);
      }

      clearInterval(msgInterval);
      clearInterval(progInterval);
      setProgress(100);
      setStep("done");
    } catch (err: any) {
      clearInterval(msgInterval);
      clearInterval(progInterval);
      setStep("error");
      setError(err.message);
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Upload Template</h1>
          <p className="text-muted-foreground">Upload a .docx template · Students will fill this with their details</p>
        </div>

        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div key="dropzone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => inputRef.current?.click()}
                className={`relative cursor-pointer rounded-2xl p-16 text-center transition-all duration-300 border-2 border-dashed
                  ${isDragging ? "border-primary bg-accent" : "border-border hover:border-primary/40 hover:bg-accent/30"}`}
                style={isDragging ? { boxShadow: "0 0 30px rgba(249,115,22,0.12)" } : {}}
              >
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-colors
                  ${isDragging ? "bg-primary/10" : "bg-secondary"}`}>
                  <Upload className={`h-7 w-7 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                  {isDragging ? "Drop your file here" : "Drag & drop your .docx file"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                <p className="text-xs text-muted-foreground">Supports .docx files up to 10MB</p>
                <input ref={inputRef} type="file" accept=".docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            </motion.div>
          )}

          {step === "metadata" && file && (
            <motion.div key="metadata" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-8">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{file.name}</h3>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setFile(null); setStep("upload"); }} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Template Label *</Label>
                  <Input value={templateLabel} onChange={(e) => setTemplateLabel(e.target.value)} placeholder="e.g. Mini Project Report - CSE Sem 6" className="bg-background border-border focus-ring-orange" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Description (optional)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief note for students..." className="bg-background border-border focus-ring-orange" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Department</Label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Semester</Label>
                    <Select value={semester} onValueChange={setSemester}>
                      <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{semesters.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Label className="text-sm text-foreground">Auto-publish after analysis</Label>
                  <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
                </div>
              </div>

              <Button onClick={startAnalysis} className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground h-12 shadow-[var(--shadow-orange)]">
                Analyze with AI <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {step === "analyzing" && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <div className="card-surface p-8 mb-8 relative overflow-hidden mx-auto max-w-xs">
                <div className="aspect-[1/1.414] bg-secondary rounded-lg relative overflow-hidden flex items-center justify-center">
                  <FileText className="h-16 w-16 text-muted-foreground/30" />
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
                    animate={{ top: ["0%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
              <div className="w-full max-w-xs mx-auto mb-6">
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-mono">{Math.round(progress)}%</p>
              </div>
              <AnimatePresence mode="wait">
                <motion.p key={currentMessage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-muted-foreground">
                  {statusMessages[currentMessage]}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card-surface p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-fc-success-bg border-2 border-fc-success flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-fc-success" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Template {autoPublish ? "Published" : "Saved"}!
              </h2>
              <p className="text-muted-foreground mb-6">
                {autoPublish ? "Students can now select and fill this template." : "Review the analysis before publishing."}
              </p>
              <div className="flex gap-3">
                <Button onClick={() => navigate(`/admin/templates/${docId}`)} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                  View Template <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/dashboard")} className="flex-1 border-border">
                  Back to Dashboard
                </Button>
              </div>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-surface p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-fc-error-bg border-2 border-fc-error flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-fc-error" />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">Analysis Failed</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => { setStep("metadata"); setProgress(0); }} variant="outline">Try Again</Button>
            </motion.div>
          )}
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
