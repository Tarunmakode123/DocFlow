import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type StudentDoc = {
  id: string;
  source_document_id: string;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  documents?: {
    template_label?: string | null;
    original_filename?: string | null;
    department_scope?: string | null;
  } | null;
};

type Review = {
  student_document_id: string;
  review_status: "pending" | "approved" | "rejected";
};

export default function AdminAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [templateData, setTemplateData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [overdueSubmissions, setOverdueSubmissions] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    totalSubmissions: 0,
    completionRate: 0,
    rejectionRate: 0,
    avgCompletionHours: 0,
    overdueCount: 0,
    upcomingCount: 0,
  });

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [{ data: docs }, { data: studentDocs }, { data: reviews }, { data: overdue }, { data: upcoming }] = await Promise.all([
        supabase.from("documents").select("*").eq("user_id", user.id),
        supabase
          .from("student_documents" as any)
          .select("id, source_document_id, status, started_at, completed_at, documents!student_documents_source_document_id_fkey(template_label, original_filename, department_scope)"),
        supabase
          .from("student_document_reviews" as any)
          .select("student_document_id, review_status"),
        supabase.from("overdue_submissions" as any).select("*"),
        supabase.from("upcoming_deadlines" as any).select("*"),
      ]);

      if (overdue) setOverdueSubmissions((overdue as any).slice(0, 5));
      if (upcoming) setUpcomingDeadlines((upcoming as any).slice(0, 5));

      if (docs) {
        // Top templates by download
        const topTemplates = docs
          .filter((d: any) => d.template_label)
          .sort((a: any, b: any) => (b.download_count || 0) - (a.download_count || 0))
          .slice(0, 8)
          .map((d: any) => ({
            name: (d.template_label || d.original_filename).substring(0, 20),
            downloads: d.download_count || 0,
          }));
        setTemplateData(topTemplates);

        // Dept breakdown
        const deptMap: Record<string, number> = {};
        docs.forEach((d: any) => {
          const dept = d.department_scope || "Other";
          deptMap[dept] = (deptMap[dept] || 0) + 1;
        });
        setDeptData(Object.entries(deptMap).map(([name, value]) => ({ name, value })));
      }

      const sDocs = ((studentDocs || []) as unknown) as StudentDoc[];
      const reviewRows = ((reviews || []) as unknown) as Review[];

      const totalSubmissions = sDocs.length;
      const completedCount = sDocs.filter((d) => d.status === "completed" || d.status === "downloaded").length;
      const completionRate = totalSubmissions > 0 ? (completedCount / totalSubmissions) * 100 : 0;

      const reviewedCount = reviewRows.filter((r) => r.review_status === "approved" || r.review_status === "rejected").length;
      const rejectedCount = reviewRows.filter((r) => r.review_status === "rejected").length;
      const rejectionRate = reviewedCount > 0 ? (rejectedCount / reviewedCount) * 100 : 0;

      const completionDurationsHours = sDocs
        .filter((d) => !!d.started_at && !!d.completed_at)
        .map((d) => {
          const start = new Date(d.started_at as string).getTime();
          const end = new Date(d.completed_at as string).getTime();
          return Math.max((end - start) / (1000 * 60 * 60), 0);
        });

      const avgCompletionHours = completionDurationsHours.length
        ? completionDurationsHours.reduce((sum, h) => sum + h, 0) / completionDurationsHours.length
        : 0;

      setKpis({
        totalSubmissions,
        completionRate,
        rejectionRate,
        avgCompletionHours,
        overdueCount: overdueSubmissions.length,
        upcomingCount: upcomingDeadlines.length,
      });

      // Enrich template chart with completion count by template
      if (sDocs.length > 0) {
        const map: Record<string, { name: string; completions: number }> = {};
        sDocs.forEach((d) => {
          const key = d.source_document_id;
          const name = d.documents?.template_label || d.documents?.original_filename || "Untitled template";
          if (!map[key]) map[key] = { name: name.substring(0, 20), completions: 0 };
          if (d.status === "completed" || d.status === "downloaded") map[key].completions += 1;
        });
        const ranked = Object.values(map)
          .sort((a, b) => b.completions - a.completions)
          .slice(0, 8);
        if (ranked.length > 0) {
          setTemplateData(ranked.map((item) => ({ name: item.name, downloads: item.completions })));
        }
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const statCards = useMemo(
    () => [
      {
        label: "Total Submissions",
        value: kpis.totalSubmissions,
        icon: TrendingUp,
        className: "text-primary",
        hint: "All student template attempts",
      },
      {
        label: "Completion Rate",
        value: `${kpis.completionRate.toFixed(1)}%`,
        icon: CheckCircle2,
        className: "text-fc-success",
        hint: "Completed/downloaded out of total",
      },
      {
        label: "Rejection Rate",
        value: `${kpis.rejectionRate.toFixed(1)}%`,
        icon: AlertTriangle,
        className: "text-fc-error",
        hint: "Rejected out of reviewed",
      },
      {
        label: "Avg Completion Time",
        value: `${kpis.avgCompletionHours.toFixed(1)}h`,
        icon: Clock3,
        className: "text-fc-info",
        hint: "From start to complete",
      },
      {
        label: "Overdue Submissions",
        value: kpis.overdueCount,
        icon: AlertTriangle,
        className: "text-red-600",
        hint: `${kpis.overdueCount} past deadline`,
      },
      {
        label: "Upcoming Deadlines",
        value: kpis.upcomingCount,
        icon: Clock3,
        className: "text-yellow-600",
        hint: "Due within 7 days",
      },
    ],
    [kpis]
  );

  const COLORS = ["hsl(25,95%,53%)", "hsl(217,91%,53%)", "hsl(142,72%,36%)", "hsl(38,90%,44%)", "hsl(330,80%,55%)", "hsl(200,70%,50%)"];

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">Analytics</h1>
      <p className="text-muted-foreground mb-8">Track template usage and student engagement</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="card-surface p-5">
            <stat.icon className={`h-5 w-5 ${stat.className} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card-surface p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Overdue Submissions
          </h3>
          {overdueSubmissions.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-auto">
              {overdueSubmissions.map((sub: any) => (
                <div key={sub.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{sub.title}</p>
                      <p className="text-xs text-muted-foreground">{sub.student_email}</p>
                      <p className="text-xs font-mono text-red-600 mt-1">{sub.days_overdue} days overdue</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">No overdue submissions</p>
          )}
        </div>

        <div className="card-surface p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-yellow-600" />
            Upcoming Deadlines (7 days)
          </h3>
          {upcomingDeadlines.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-auto">
              {upcomingDeadlines.map((deadline: any) => (
                <div key={deadline.id} className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{deadline.title}</p>
                      <p className="text-xs text-muted-foreground">{deadline.student_email}</p>
                      <p className="text-xs font-mono text-yellow-700 mt-1">{deadline.days_remaining} days left • {new Date(deadline.deadline).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">No upcoming deadlines</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card-surface p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Top Templates by Completions</h3>
          {templateData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={templateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(38,20%,89%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215,16%,47%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215,16%,47%)" }} />
                <Tooltip />
                <Bar dataKey="downloads" name="Completions" fill="hsl(25,95%,53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-12">No data yet</p>
          )}
        </div>

        <div className="card-surface p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Templates by Department</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={deptData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-12">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
