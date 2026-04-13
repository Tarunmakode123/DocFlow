import { useEffect, useState } from "react";
import { CheckCircle, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function StudentCompleted() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("student_documents" as any)
      .select("*, documents!student_documents_source_document_id_fkey(template_label, original_filename, total_pages, department_scope)")
      .eq("student_id", user.id)
      .in("status", ["completed", "downloaded"])
      .order("completed_at", { ascending: false })
      .then(({ data }) => {
        if (data) setDocs(data);
        setLoading(false);
      });
  }, [user]);

  const handleDownload = async (doc: any) => {
    setDownloadingId(doc.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-document", {
        body: { documentId: doc.source_document_id },
      });
      if (error) throw new Error(error.message);
      if (data?.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = `${(doc.documents?.template_label || "document").replace(/\s+/g, "_")}_filled.docx`;
        a.click();
      }
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">Completed Documents</h1>
      <p className="text-muted-foreground mb-8">All your filled documents ready for download</p>

      {docs.length === 0 ? (
        <div className="card-surface p-12 text-center">
          <p className="text-muted-foreground">No completed documents yet. Fill a template to see it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => {
            const source = doc.documents;
            return (
              <div key={doc.id} className="card-surface p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-fc-success" />
                  <div>
                    <h3 className="font-medium text-foreground">{source?.template_label || source?.original_filename}</h3>
                    <p className="text-xs text-muted-foreground">
                      {source?.department_scope && `${source.department_scope} · `}
                      {doc.completed_at ? new Date(doc.completed_at).toLocaleDateString() : ""}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border"
                  disabled={downloadingId === doc.id}
                  onClick={() => handleDownload(doc)}
                >
                  {downloadingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-1" />Download</>}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
