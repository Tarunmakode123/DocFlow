import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Upload, Users, Zap, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0, downloads: 0, tokens: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (docs) {
        setTemplates(docs);
        const published = docs.filter((d: any) => d.is_published);
        const totalDownloads = docs.reduce((sum: number, d: any) => sum + (d.download_count || 0), 0);
        setStats({
          total: docs.length,
          published: published.length,
          downloads: totalDownloads,
          tokens: 0,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const statusMap: Record<string, { label: string; className: string }> = {
    uploading: { label: "Uploading", className: "bg-muted text-muted-foreground" },
    analyzing: { label: "Analyzing", className: "bg-fc-info-bg text-fc-info border border-blue-200" },
    in_progress: { label: "Draft", className: "bg-fc-warning-bg text-fc-warning border border-amber-200" },
    analyzed: { label: "Ready", className: "bg-fc-info-bg text-fc-info border border-blue-200" },
    completed: { label: "Published", className: "bg-fc-success-bg text-fc-success border border-green-200" },
    error: { label: "Error", className: "bg-fc-error-bg text-fc-error border border-red-200" },
  };

  const statCards = [
    { label: "Total Templates", value: stats.total, icon: FileText, color: "text-primary" },
    { label: "Published", value: stats.published, icon: Upload, color: "text-fc-success" },
    { label: "Total Downloads", value: stats.downloads, icon: Users, color: "text-fc-info" },
    { label: "AI Tokens Used", value: stats.tokens, icon: Zap, color: "text-fc-warning" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your document templates</p>
        </div>
        <Button onClick={() => navigate("/admin/upload")} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[var(--shadow-orange)]">
          <Upload className="h-4 w-4 mr-2" />
          Upload Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="card-surface p-5">
            <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Templates List */}
      <h2 className="font-display text-lg font-semibold text-foreground mb-4">Recent Templates</h2>
      {templates.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-surface p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">No templates yet</h3>
          <p className="text-muted-foreground mb-6">Upload your first .docx template for students to fill.</p>
          <Button onClick={() => navigate("/admin/upload")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Upload Your First Template <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {templates.map((doc: any, i: number) => {
            const status = statusMap[doc.status] || statusMap.error;
            const isPublished = doc.is_published;
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card-surface-hover p-5 flex items-center justify-between cursor-pointer"
                onClick={() => navigate(`/admin/templates/${doc.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{doc.template_label || doc.original_filename}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {doc.department_scope && `${doc.department_scope} · `}
                      {doc.total_pages ? `${doc.total_pages} pages · ` : ""}
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={status.className}>{isPublished ? "Published" : status.label}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
