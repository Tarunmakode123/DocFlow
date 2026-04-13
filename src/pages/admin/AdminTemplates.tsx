import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminTemplates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setTemplates(data);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">My Templates</h1>
          <p className="text-muted-foreground mt-1">Manage all your uploaded templates</p>
        </div>
        <Button onClick={() => navigate("/admin/upload")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Upload New
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="card-surface p-12 text-center">
          <p className="text-muted-foreground">No templates uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((doc, i) => (
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
                {doc.is_published ? (
                  <Badge className="bg-fc-success-bg text-fc-success border border-green-200">Published</Badge>
                ) : (
                  <Badge className="bg-fc-warning-bg text-fc-warning border border-amber-200">Draft</Badge>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
