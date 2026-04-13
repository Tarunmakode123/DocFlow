import { useAuth } from "@/contexts/AuthContext";

export default function AdminSettings() {
  const { user, profile } = useAuth();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Manage your account and preferences</p>

      <div className="card-surface p-6 mb-4">
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
            <p className="text-foreground capitalize">{profile?.role || "—"}</p>
          </div>
        </div>
      </div>

      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-foreground font-medium">Free Plan</p>
            <p className="text-xs text-muted-foreground">3 templates per month</p>
          </div>
          <span className="text-xs font-mono text-muted-foreground px-3 py-1.5 rounded-lg bg-secondary">
            Pro ₹299/mo — Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}
