import { useAuth } from "@/contexts/AuthContext";

export default function StudentSettings() {
  const { user, profile } = useAuth();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Manage your account</p>

      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Account</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <p className="text-foreground">{user?.email}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <p className="text-foreground">{profile?.full_name || "—"}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Role</label>
            <p className="text-foreground capitalize">{profile?.role || "student"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
