import { useEffect, useState } from "react";
import { Loader2, Mail, Send, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Template = {
  id: string;
  template_name: string;
  template_type: string;
  subject: string;
  body: string;
  variables: string[];
};

type Campaign = {
  id: string;
  campaign_name: string;
  template_id: string;
  filter_criteria: Record<string, any>;
  recipient_count: number;
  campaign_status: string;
  sent_at: string | null;
  created_at: string;
};

export default function AdminBulkMessaging() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [campaignName, setCampaignName] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("overdue");
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const [{ data: templatesData }, { data: campaignsData }] = await Promise.all([
        supabase.from("communication_templates" as any).select("*").eq("is_active", true),
        supabase.from("message_campaigns" as any).select("*").eq("created_by", user.id).order("created_at", { ascending: false }),
      ]);

      if (templatesData) setTemplates(templatesData as any);
      if (campaignsData) setCampaigns(campaignsData as any);
      setLoading(false);
    };

    loadData();
  }, [user]);

  const createCampaign = async () => {
    if (!selectedTemplate || !campaignName.trim() || !user) {
      toast({ title: "Missing fields", description: "Fill in all required fields.", variant: "destructive" });
      return;
    }

    setCreatingCampaign(true);

    // Build filter criteria
    const filterCriteria: Record<string, any> = {};
    if (filterStatus === "overdue") {
      filterCriteria.status = "overdue";
    } else if (filterStatus === "pending_approval") {
      filterCriteria.review_status = "pending";
    } else if (filterStatus === "changes_requested") {
      filterCriteria.review_status = "rejected";
    }

    const { data: newCampaign, error } = await supabase
      .from("message_campaigns" as any)
      .insert({
        created_by: user.id,
        campaign_name: campaignName,
        template_id: selectedTemplate,
        filter_criteria: filterCriteria,
        recipient_count: 0,
        campaign_status: "draft",
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Campaign creation failed", description: error.message, variant: "destructive" });
      setCreatingCampaign(false);
      return;
    }

    // Refresh campaigns
    const { data: updatedCampaigns } = await supabase
      .from("message_campaigns" as any)
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (updatedCampaigns) setCampaigns(updatedCampaigns as any);

    toast({ title: "Campaign created", description: "Draft ready to be sent." });
    setCampaignName("");
    setSelectedTemplate("");
    setCreatingCampaign(false);
  };

  const sendCampaign = async (campaignId: string) => {
    if (!user) return;

    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;

    setCreatingCampaign(true);

    // Get template details
    const template = templates.find((t) => t.id === campaign.template_id);
    if (!template) {
      toast({ title: "Template not found", variant: "destructive" });
      setCreatingCampaign(false);
      return;
    }

    // Simulate sending messages (in real app, would call backend function)
    const { data: messagesToSend, error: fetchError } = await supabase
      .from("student_documents" as any)
      .select("student_id, student:student_profiles(*), documents!student_documents_source_document_id_fkey(*)")
      .limit(50); // Demo limit

    if (fetchError || !messagesToSend) {
      toast({ title: "Failed to fetch recipients", description: fetchError?.message, variant: "destructive" });
      setCreatingCampaign(false);
      return;
    }

    // Create message records
    const messages = messagesToSend.map((doc: any) => ({
      campaign_id: campaignId,
      student_id: doc.student_id,
      subject: template.subject.replace("{{document_title}}", doc.documents?.template_label || "Document"),
      message_body: template.body
        .replace("{{student_name}}", doc.student?.full_name || "Student")
        .replace("{{document_title}}", doc.documents?.template_label || "Document"),
      message_type: "both",
    }));

    if (messages.length > 0) {
      const { error: insertError } = await supabase.from("student_messages" as any).insert(messages);

      if (insertError) {
        toast({ title: "Failed to send messages", description: insertError.message, variant: "destructive" });
        setCreatingCampaign(false);
        return;
      }
    }

    // Update campaign status
    await supabase
      .from("message_campaigns" as any)
      .update({ campaign_status: "sent", sent_at: new Date().toISOString(), recipient_count: messages.length })
      .eq("id", campaignId);

    // Refresh campaigns
    const { data: updatedCampaigns } = await supabase
      .from("message_campaigns" as any)
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (updatedCampaigns) setCampaigns(updatedCampaigns as any);

    toast({
      title: "Campaign sent",
      description: `${messages.length} message(s) sent successfully.`,
    });
    setCreatingCampaign(false);
  };

  const deleteCampaign = async (campaignId: string) => {
    const { error } = await supabase.from("message_campaigns" as any).delete().eq("id", campaignId);

    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }

    setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    toast({ title: "Campaign deleted" });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">Bulk Messaging</h1>
      <p className="text-muted-foreground mb-8">Send messages to groups of students</p>

      {/* Create Campaign Form */}
      <div className="card-surface p-6 mb-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">New Campaign</h2>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                placeholder="e.g., Deadline Reminder - March Batch"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="template-select">Message Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger id="template-select" className="bg-background border-border">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.template_name} ({t.template_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="filter-select">Send to Students Who Are</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id="filter-select" className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overdue">Have Overdue Submissions</SelectItem>
                <SelectItem value="pending_approval">Awaiting Approval</SelectItem>
                <SelectItem value="changes_requested">Have Requested Changes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Template Preview</Label>
            {selectedTemplate && templates.find((t) => t.id === selectedTemplate) && (
              <div className="bg-muted/40 border border-border rounded-lg p-4 text-sm space-y-2">
                <p className="font-semibold">{templates.find((t) => t.id === selectedTemplate)?.subject}</p>
                <p className="text-muted-foreground whitespace-pre-wrap text-xs">{templates.find((t) => t.id === selectedTemplate)?.body}</p>
              </div>
            )}
          </div>

          <Button
            onClick={createCampaign}
            disabled={creatingCampaign || !selectedTemplate || !campaignName.trim()}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {creatingCampaign ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Campaigns</h2>

        {campaigns.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No campaigns yet</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="border border-border rounded-lg p-4 hover:bg-muted/30 transition"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground">{campaign.campaign_name}</p>
                      <Badge className={campaign.campaign_status === "sent" ? "bg-green-600" : "bg-yellow-600"}>
                        {campaign.campaign_status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {campaign.recipient_count > 0 ? `${campaign.recipient_count} recipient${campaign.recipient_count !== 1 ? "s" : ""}` : "Ready to send"} •{" "}
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {campaign.campaign_status === "draft" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => sendCampaign(campaign.id)}
                          disabled={creatingCampaign}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                              <AlertDialogDescription>This will delete the draft campaign permanently.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCampaign(campaign.id)} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border"
                      onClick={() => setExpandedCampaignId(expandedCampaignId === campaign.id ? null : campaign.id)}
                    >
                      {expandedCampaignId === campaign.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {expandedCampaignId === campaign.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium text-foreground mb-2">Template Details</p>
                    {templates.find((t) => t.id === campaign.template_id) && (
                      <div className="bg-muted/40 border border-border rounded p-3 text-xs space-y-2">
                        <p className="font-semibold">{templates.find((t) => t.id === campaign.template_id)?.subject}</p>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {templates.find((t) => t.id === campaign.template_id)?.body}
                        </p>
                        {campaign.sent_at && (
                          <p className="text-muted-foreground pt-2">Sent: {new Date(campaign.sent_at).toLocaleString()}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
