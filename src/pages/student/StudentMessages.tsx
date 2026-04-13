import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StudentMessages from "@/components/StudentMessages";

export default function StudentMessagesPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="border-b border-border px-4 md:px-6 py-4 bg-card shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/student/dashboard")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="font-display text-2xl font-bold text-foreground">Messages & Notifications</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <StudentMessages />
        </div>
      </div>
    </div>
  );
}
