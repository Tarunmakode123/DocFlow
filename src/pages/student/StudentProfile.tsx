import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const departments = ["CSE", "IT", "ECE", "ME", "CE", "EE"];
const semesters = ["1", "2", "3", "4", "5", "6", "7", "8"];
const academicYears = ["2024-25", "2025-26", "2026-27"];

export default function StudentProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    roll_number: "",
    enrollment_number: "",
    sap_id: "",
    department: "",
    division: "",
    class: "",
    semester: "",
    academic_year: "",
    college_name: "",
    university_name: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        roll_number: profile.roll_number || "",
        enrollment_number: profile.enrollment_number || "",
        sap_id: profile.sap_id || "",
        department: profile.department || "",
        division: profile.division || "",
        class: profile.class || "",
        semester: profile.semester || "",
        academic_year: profile.academic_year || "",
        college_name: profile.college_name || "",
        university_name: profile.university_name || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_profiles" as any)
      .update(form)
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profile saved", description: "Your details will auto-fill in future documents." });
    }
    setSaving(false);
  };

  const updateField = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-1">My Profile</h1>
        <p className="text-muted-foreground">Your details auto-fill across all document templates</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Full Name *</Label>
            <Input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} placeholder="Your full name" className="bg-background border-border focus-ring-orange" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Roll Number *</Label>
              <Input value={form.roll_number} onChange={(e) => updateField("roll_number", e.target.value)} placeholder="e.g. 42" className="bg-background border-border focus-ring-orange" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Enrollment Number</Label>
              <Input value={form.enrollment_number} onChange={(e) => updateField("enrollment_number", e.target.value)} placeholder="e.g. A12345" className="bg-background border-border focus-ring-orange" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">SAP ID / PRN</Label>
              <Input value={form.sap_id} onChange={(e) => updateField("sap_id", e.target.value)} placeholder="Optional" className="bg-background border-border focus-ring-orange" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Division</Label>
              <Input value={form.division} onChange={(e) => updateField("division", e.target.value)} placeholder="e.g. A" className="bg-background border-border focus-ring-orange" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Department</Label>
              <Select value={form.department} onValueChange={(v) => updateField("department", v)}>
                <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Semester</Label>
              <Select value={form.semester} onValueChange={(v) => updateField("semester", v)}>
                <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{semesters.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Academic Year</Label>
              <Select value={form.academic_year} onValueChange={(v) => updateField("academic_year", v)}>
                <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{academicYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Class</Label>
            <Input value={form.class} onChange={(e) => updateField("class", e.target.value)} placeholder="e.g. TE-A" className="bg-background border-border focus-ring-orange" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">College Name</Label>
              <Input value={form.college_name} onChange={(e) => updateField("college_name", e.target.value)} placeholder="Your college" className="bg-background border-border focus-ring-orange" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">University Name</Label>
              <Input value={form.university_name} onChange={(e) => updateField("university_name", e.target.value)} placeholder="Affiliated university" className="bg-background border-border focus-ring-orange" />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[var(--shadow-orange)]">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Profile
        </Button>
      </motion.div>
    </div>
  );
}
