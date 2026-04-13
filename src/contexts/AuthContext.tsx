import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "student";

interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string | null;
  college_name: string | null;
  department: string | null;
  roll_number: string | null;
  enrollment_number: string | null;
  sap_id: string | null;
  division: string | null;
  class: string | null;
  semester: string | null;
  academic_year: string | null;
  university_name: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  role: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const getFallbackProfile = (userId: string, meta: Record<string, any> | null | undefined): UserProfile => ({
    id: userId,
    role: ((meta?.role as UserRole) || "student"),
    full_name: (meta?.full_name as string) || null,
    college_name: null,
    department: null,
    roll_number: null,
    enrollment_number: null,
    sap_id: null,
    division: null,
    class: null,
    semester: null,
    academic_year: null,
    university_name: null,
  });

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      // Allow sign-in flow even when migrations are not applied yet.
      if (error.code === "PGRST205" || error.message?.includes("user_profiles")) {
        const { data: { user } } = await supabase.auth.getUser();
        setProfile(getFallbackProfile(userId, user?.user_metadata as Record<string, any>));
        return;
      }
    }

    if (data) {
      setProfile(data as unknown as UserProfile);
    } else if (!data && !error) {
      // No profile row exists — create a default one from auth metadata
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.user_metadata?.role || "student";
      const full_name = user?.user_metadata?.full_name || null;
      const { data: newProfile } = await supabase
        .from("user_profiles")
        .upsert({ id: userId, role, full_name } as any, { onConflict: "id" })
        .select("*")
        .single();
      if (newProfile) {
        setProfile(newProfile as unknown as UserProfile);
      } else {
        setProfile(getFallbackProfile(userId, user?.user_metadata as Record<string, any>));
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      setProfile(getFallbackProfile(userId, user?.user_metadata as Record<string, any>));
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        role: profile?.role ?? null,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
