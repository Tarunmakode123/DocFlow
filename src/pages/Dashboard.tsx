import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Clock, CheckCircle, AlertCircle, ArrowRight, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  uploading: { label: "Uploading", color: "bg-muted text-muted-foreground", icon: Clock, pulse: true },
  analyzing: { label: "Analyzing", color: "bg-primary/20 text-primary", icon: Clock, pulse: true },
  in_progress: { label: "In Progress", color: "bg-fc-amber/20 text-fc-amber", icon: Clock, pulse: false },
  completed: { label: "Completed", color: "bg-fc-success/20 text-fc-success", icon: CheckCircle, pulse: false },
  error: { label: "Error", color: "bg-destructive/20 text-destructive", icon: AlertCircle, pulse: false },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchDocs = async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setDocuments(data);
      setLoading(false);
    };
    fetchDocs();
  }, [user]);

  const handleResume = (doc: any) => {
    if (doc.status === "analyzing") navigate(`/document/${doc.id}/analyze`);
    else if (doc.status === "in_progress") navigate(`/document/${doc.id}/fill`);
    else if (doc.status === "completed") navigate(`/document/${doc.id}/complete`);
  };

  const handleDownload = async (doc: any) => {
    setDownloadingId(doc.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-document", {
        body: { documentId: doc.id },
      });
      if (error) throw new Error(error.message);
      if (data?.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = data.filename || `${doc.original_filename.replace(".docx", "")}_filled.docx`;
        a.click();
      }
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your documents at a glance</p>
        </div>
        <Button onClick={() => navigate("/upload")} className="bg-primary hover:bg-primary/90">
          <FileText className="h-4 w-4 mr-2" />
          Upload New
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : documents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">No documents yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Upload your teacher's .docx template to get started. Our AI will detect every field automatically.
          </p>
          <Button onClick={() => navigate("/upload")} className="bg-primary hover:bg-primary/90">
            Upload Your First Document
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc: any, i: number) => {
            const status = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.error;
            const StatusIcon = status.icon;
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card-hover p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{doc.original_filename}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {doc.total_pages ? `${doc.total_pages} pages · ` : ""}
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`${status.color} ${status.pulse ? "animate-pulse" : ""}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                  {doc.status === "completed" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={downloadingId === doc.id}
                      onClick={() => handleDownload(doc)}
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  {(doc.status === "in_progress" || doc.status === "analyzing") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => handleResume(doc)}
                    >
                      Resume
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
