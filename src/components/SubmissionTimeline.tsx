import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Clock, AlertCircle, RefreshCw, XCircle, FileText } from "lucide-react";

type TimelineEvent = {
  id: string;
  status: string;
  previous_status: string | null;
  timestamp: string;
  reason: string | null;
};

type StatusDefinition = {
  status_key: string;
  display_name: string;
  icon: string;
  color_class: string;
  order_index: number;
};

const iconMap: Record<string, any> = {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  XCircle,
};

export default function SubmissionTimeline({ studentDocumentId }: { studentDocumentId: string }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [statusDefs, setStatusDefs] = useState<Record<string, StatusDefinition>>({});

  useEffect(() => {
    if (!studentDocumentId) return;

    const loadData = async () => {
      const [{ data: timelineData }, { data: defs }] = await Promise.all([
        supabase
          .from("submission_status_events" as any)
          .select("id, status, previous_status, created_at, change_reason")
          .eq("student_document_id", studentDocumentId)
          .order("created_at", { ascending: true }),
        supabase.from("submission_status_definitions" as any).select("*"),
      ]);

      if (timelineData) {
        const mapped = (timelineData as any).map((e: any) => ({
          id: e.id,
          status: e.status,
          previous_status: e.previous_status,
          timestamp: e.created_at,
          reason: e.change_reason,
        }));
        setEvents(mapped);
      }

      if (defs) {
        const defMap: Record<string, StatusDefinition> = {};
        (defs as any).forEach((d: any) => {
          defMap[d.status_key] = d;
        });
        setStatusDefs(defMap);
      }

      setLoading(false);
    };

    loadData();
  }, [studentDocumentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <p>No status updates yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {events.map((event, idx) => {
        const def = statusDefs[event.status];
        const isLast = idx === events.length - 1;

        return (
          <div key={event.id} className="relative flex gap-4">
            {/* Timeline connector line */}
            {!isLast && (
              <div className="absolute left-[19px] top-12 w-0.5 h-8 bg-border" />
            )}

            {/* Status dot */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 border-border flex items-center justify-center ${def?.color_class || "bg-muted text-muted-foreground"}`}>
              {def && iconMap[def.icon] ? (
                <>
                  {(() => {
                    const IconComponent = iconMap[def.icon];
                    return <IconComponent className="h-5 w-5" />;
                  })()}
                </>
              ) : (
                <div className="w-2 h-2 bg-current rounded-full" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm text-foreground">{def?.display_name || event.status}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {def?.description && (
                <p className="text-xs text-muted-foreground mb-1">{def.description}</p>
              )}
              {event.reason && (
                <div className="mt-2 p-2 bg-muted/40 rounded border border-border text-xs text-foreground">
                  <p className="font-medium text-muted-foreground">Reason:</p>
                  <p>{event.reason}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
