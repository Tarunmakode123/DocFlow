import { useEffect, useState } from "react";
import { Mail, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Message = {
  id: string;
  subject: string;
  message_body: string;
  message_type: string;
  is_read: boolean;
  sent_at: string;
};

export default function StudentMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("student_messages" as any)
        .select("id, subject, message_body, message_type, is_read, sent_at")
        .eq("student_id", user.id)
        .order("sent_at", { ascending: false });

      if (data) {
        setMessages(data as any);
        setUnreadCount(data.filter((m: any) => !m.is_read).length);
      }

      setLoading(false);
    };

    loadMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "student_messages", filter: `student_id=eq.${user.id}` },
        (payload: any) => {
          setMessages((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const markAsRead = async (messageId: string) => {
    await supabase
      .from("student_messages" as any)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", messageId);

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
    );
    setUnreadCount((prev) => Math.max(prev - 1, 0));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with unread count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold text-foreground">Messages</h2>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-white">{unreadCount} unread</Badge>
          )}
        </div>
      </div>

      {/* Messages list */}
      {messages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No messages</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`border border-border rounded-lg p-4 cursor-pointer transition hover:bg-muted/50 ${
                !message.is_read ? "bg-primary/5" : ""
              }`}
              onClick={() => {
                setSelectedMessage(message);
                if (!message.is_read) {
                  markAsRead(message.id);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm font-medium ${!message.is_read ? "text-foreground font-semibold" : "text-foreground"}`}>
                      {message.subject}
                    </p>
                    {!message.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {message.message_body}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(message.sent_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {message.message_type === "email" && (
                    <Badge variant="outline" className="text-xs">📧 Email</Badge>
                  )}
                  {message.message_type === "in_app" && (
                    <Badge variant="outline" className="text-xs">🔔 In-app</Badge>
                  )}
                  {message.message_type === "both" && (
                    <Badge variant="outline" className="text-xs">📧 Both</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message detail dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.subject}</DialogTitle>
            <DialogDescription>
              {selectedMessage &&
                new Date(selectedMessage.sent_at).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </DialogDescription>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-4">
              <div className="bg-muted/40 border border-border rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{selectedMessage.message_body}</p>
              </div>

              <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                <span>
                  {selectedMessage.message_type === "email" && "📧 Sent via email"}
                  {selectedMessage.message_type === "in_app" && "🔔 In-app notification"}
                  {selectedMessage.message_type === "both" && "📧 Email & in-app"}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
