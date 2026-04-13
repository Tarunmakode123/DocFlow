import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  User,
  GraduationCap,
  Users,
  FileText,
  CheckCircle2,
  Shield,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AuthMode = "login" | "signup" | "forgot";
type RoleChoice = "admin" | "student";

// Marketing content
const trustBadge = "Trusted by 200+ institutions";

const features = [
  {
    icon: FileText,
    title: "Automated Forms",
    description: "Transform documents into interactive, fillable workflows instantly.",
  },
  {
    icon: Shield,
    title: "Faculty Review Tools",
    description: "Approve, reject, or request changes with streamlined workflows.",
  },
  {
    icon: Zap,
    title: "Secure Role Access",
    description: "Role-based permissions keep data properly scoped and protected.",
  },
  {
    icon: CheckCircle2,
    title: "AI Field Extraction",
    description: "Automatically extract and populate form fields from documents.",
  },
];

const stats = [
  { label: "2 Roles", sublabel: "Faculty + Student" },
  { label: "1 Unified Flow", sublabel: "Upload → Review → Done" },
  { label: "0 Friction", sublabel: "Simple. Fast. Done." },
];

const trustBadges = [
  { icon: CheckCircle2, text: "Role-based access" },
  { icon: Shield, text: "Review pipelines" },
  { icon: Lock, text: "Supabase Auth" },
];

const capabilityPills = [
  "AI Extraction",
  "Smart Routing",
  "Deadline Alerts",
  "Role Access",
];

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleChoice>("student");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { role } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role: selectedRole },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        // Create user_profiles row
        if (signUpData.user) {
          const { error: profileError } = await supabase
            .from("user_profiles")
            .upsert(
              {
                id: signUpData.user.id,
                role: selectedRole,
                full_name: fullName,
              },
              { onConflict: "id" }
            );
          if (profileError) console.error("Profile creation error:", profileError);
        }

        const redirect = selectedRole === "admin" ? "/admin/dashboard" : "/student/dashboard";
        navigate(redirect);
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({
          title: "Reset link sent",
          description: "Check your email for the password reset link.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Redirect after login when role is loaded
  const { session } = useAuth();
  if (session && role) {
    const redirect = role === "admin" ? "/admin/dashboard" : "/student/dashboard";
    navigate(redirect, { replace: true });
  }

  const handleGoogleLogin = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/`,
    });
    if (result?.error) {
      toast({
        title: "Error",
        description: String(result.error),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: "#0f0f0f" }}>
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full blur-3xl animate-pulse" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)" }} />
        <div className="absolute top-1/4 -right-48 h-96 w-96 rounded-full blur-3xl animate-pulse" style={{ background: "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)", animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)" }} />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] xl:grid-cols-[1.3fr_0.7fr]">
            {/* LEFT PANEL - Marketing */}
            <motion.section
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col justify-center space-y-8"
            >
              {/* Logo */}
              <div className="flex items-center gap-3">
                <img src="/docflow-logo.svg" alt="DocFlow" className="h-12 w-auto max-w-full" />
              </div>

              {/* Trust Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex items-center gap-2 rounded-full border w-fit px-4 py-2 backdrop-blur-sm"
                style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(26, 26, 26, 0.5)" }}
              >
                <div className="flex h-2 w-2 rounded-full" style={{ backgroundColor: "#22c55e" }} />
                <span className="text-sm font-medium" style={{ color: "#e0e0e0" }}>{trustBadge}</span>
              </motion.div>

              {/* Main Headline */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <h2 className="font-display text-5xl lg:text-6xl font-bold tracking-tight leading-tight [text-wrap:balance]" style={{ color: "#ffffff" }}>
                  The smartest way to manage academic documents.
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: "#d0d0d0" }}>
                  DocFlow automates document collection, AI field extraction, faculty review, and student
                  submissions — in one clean workflow.
                </p>
              </motion.div>

              {/* Capability Pills */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-wrap gap-3"
              >
                {capabilityPills.map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-sm"
                    style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(26, 26, 26, 0.5)", color: "#ffffff" }}
                  >
                    {pill}
                  </span>
                ))}
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="grid grid-cols-3 gap-4 pt-4"
              >
                {stats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border p-4 backdrop-blur-sm"
                    style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(26, 26, 26, 0.8)" }}
                  >
                    <div className="font-display text-2xl font-bold" style={{ color: "#ffffff" }}>{stat.label}</div>
                    <div className="mt-2 text-xs font-medium uppercase tracking-wide" style={{ color: "#888" }}>
                      {stat.sublabel}
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Feature Cards */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="grid grid-cols-2 gap-4 pt-2"
              >
                {features.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      className="group rounded-xl border p-5 backdrop-blur-sm transition-all duration-300 cursor-pointer"
                      style={{ 
                        borderColor: "#2a2a2a", 
                        backgroundColor: "rgba(26, 26, 26, 0.6)"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#3a3a3a";
                        e.currentTarget.style.backgroundColor = "rgba(34, 34, 34, 0.8)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#2a2a2a";
                        e.currentTarget.style.backgroundColor = "rgba(26, 26, 26, 0.6)";
                      }}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg transition-all duration-300" style={{ background: "linear-gradient(to bottom right, rgba(249,115,22,0.2), rgba(234,88,12,0.1))" }}>
                        <Icon className="h-6 w-6" style={{ color: "#f97316" }} strokeWidth={2} />
                      </div>
                      <h3 className="mt-4 font-display text-base font-semibold" style={{ color: "#ffffff" }}>
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6" style={{ color: "#aaa" }}>{feature.description}</p>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="flex flex-wrap items-center gap-6 pt-4"
              >
                {trustBadges.map((badge, idx) => {
                  const Icon = badge.icon;
                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm" style={{ color: "#c0c0c0" }}>
                      <Icon className="h-4 w-4" style={{ color: "#22c55e" }} strokeWidth={2} />
                      <span className="font-medium">{badge.text}</span>
                    </div>
                  );
                })}
              </motion.div>
            </motion.section>

            {/* RIGHT PANEL - Auth Form */}
            <motion.aside
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="flex items-center justify-center"
            >
              <div className="w-full max-w-md">
                {/* Outer glow border container */}
                <div className="rounded-[24px] border p-1 shadow-2xl" style={{ borderColor: "#2a2a2a", background: "linear-gradient(180deg, rgba(26, 26, 26, 0.9) 0%, rgba(15, 15, 15, 0.8) 100%)" }}>
                  {/* Inner content container */}
                  <div className="rounded-[20px] border p-8 backdrop-blur-sm" style={{ borderColor: "rgba(58, 58, 58, 0.5)", backgroundColor: "rgba(26, 26, 26, 0.6)" }}>
                    {/* Badge */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] mb-6"
                      style={{ background: "linear-gradient(to right, rgba(249,115,22,0.2), rgba(234,88,12,0.1))", color: "#f97316" }}
                    >
                      <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Secure Access
                    </motion.div>

                    {/* Header */}
                    <h2 className="font-display text-3xl font-bold" style={{ color: "#ffffff" }}>
                      {mode === "login"
                        ? "Welcome back"
                        : mode === "signup"
                          ? "Create your account"
                          : "Reset password"}
                    </h2>
                    <p className="mt-2 text-sm" style={{ color: "#aaa" }}>
                      {mode === "login"
                        ? "Sign in to continue to your dashboard."
                        : mode === "signup"
                          ? "Set up your faculty or student workspace."
                          : "Enter your email to receive a reset link."}
                    </p>

                    {/* Role Selector (hidden on forgot password) */}
                    {mode !== "forgot" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.25 }}
                        className="mt-8 rounded-2xl border p-1"
                        style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(15, 15, 15, 0.8)" }}
                      >
                        <div className="grid grid-cols-2 gap-1">
                          {["admin", "student"].map((roleOpt) => (
                            <button
                              key={roleOpt}
                              type="button"
                              onClick={() => setSelectedRole(roleOpt as RoleChoice)}
                              className={`relative flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-300`}
                              style={
                                selectedRole === roleOpt
                                  ? {
                                      background: "linear-gradient(to bottom right, #f97316, #ea580c)",
                                      color: "#ffffff",
                                      boxShadow: "0 0 20px rgba(249, 115, 22, 0.3)",
                                    }
                                  : {
                                      color: "#999",
                                      backgroundColor: "transparent",
                                    }
                              }
                              onMouseEnter={(e) => {
                                if (selectedRole !== roleOpt) {
                                  e.currentTarget.style.backgroundColor = "#222";
                                  e.currentTarget.style.color = "#fff";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedRole !== roleOpt) {
                                  e.currentTarget.style.backgroundColor = "transparent";
                                  e.currentTarget.style.color = "#999";
                                }
                              }}
                            >
                              {roleOpt === "admin" ? (
                                <>
                                  <GraduationCap className="h-4 w-4" strokeWidth={2.5} />
                                  Faculty
                                </>
                              ) : (
                                <>
                                  <Users className="h-4 w-4" strokeWidth={2.5} />
                                  Student
                                </>
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                      {mode === "signup" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider" style={{ color: "#888" }}>
                            Full Name
                          </Label>
                          <div className="relative mt-2">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#626262" }} strokeWidth={2} />
                            <Input
                              id="name"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="John Doe"
                              className="h-12 rounded-lg border pl-10"
                              style={{
                                borderColor: "#2a2a2a",
                                backgroundColor: "rgba(15, 15, 15, 0.8)",
                                color: "#ffffff",
                              }}
                              required
                            />
                          </div>
                        </motion.div>
                      )}

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: mode === "signup" ? 0.05 : 0 }}
                      >
                        <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider" style={{ color: "#888" }}>
                          Email
                        </Label>
                        <div className="relative mt-2">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#626262" }} strokeWidth={2} />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@college.edu"
                            className="h-12 rounded-lg border pl-10"
                            style={{
                              borderColor: "#2a2a2a",
                              backgroundColor: "rgba(15, 15, 15, 0.8)",
                              color: "#ffffff",
                            }}
                            required
                          />
                        </div>
                      </motion.div>

                      {mode !== "forgot" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        >
                          <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider" style={{ color: "#888" }}>
                            Password
                          </Label>
                          <div className="relative mt-2">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#626262" }} strokeWidth={2} />
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className="h-12 rounded-lg border pl-10 pr-10"
                              style={{
                                borderColor: "#2a2a2a",
                                backgroundColor: "rgba(15, 15, 15, 0.8)",
                                color: "#ffffff",
                              }}
                              required
                              minLength={6}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                              style={{ color: "#626262" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#a0a0a0")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "#626262")}
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" strokeWidth={2} />
                              ) : (
                                <Eye className="h-4 w-4" strokeWidth={2} />
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                      >
                        <Button
                          type="submit"
                          disabled={loading}
                          className="h-12 w-full rounded-lg text-white font-semibold transition-all duration-300"
                          style={{
                            background: "linear-gradient(to right, #f97316, #ea580c)",
                            boxShadow: "0 0 20px rgba(249, 115, 22, 0.3)",
                          }}
                          onMouseEnter={(e) => {
                            if (!loading) {
                              e.currentTarget.style.boxShadow = "0 0 30px rgba(249, 115, 22, 0.5)";
                              e.currentTarget.style.transform = "scale(1.02)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = "0 0 20px rgba(249, 115, 22, 0.3)";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              {mode === "login"
                                ? "Sign In"
                                : mode === "signup"
                                  ? "Create Account"
                                  : "Send Reset Link"}
                              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.5} />
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </form>

                    {/* Divider and Google OAuth */}
                    {mode !== "forgot" && (
                      <>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                          className="relative my-7"
                        >
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t" style={{ borderColor: "#2a2a2a" }} />
                          </div>
                          <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest" style={{ color: "#626262" }}>
                            <span style={{ backgroundColor: "rgba(26, 26, 26, 0.6)" }} className="px-3">or continue with</span>
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.25 }}
                        >
                          <Button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="h-12 w-full rounded-lg border font-semibold transition-all duration-300"
                            style={{
                              borderColor: "#2a2a2a",
                              backgroundColor: "rgba(15, 15, 15, 0.5)",
                              color: "#a0a0a0",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(26, 26, 26, 1)";
                              e.currentTarget.style.color = "#ffffff";
                              e.currentTarget.style.borderColor = "#3a3a3a";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(15, 15, 15, 0.5)";
                              e.currentTarget.style.color = "#a0a0a0";
                              e.currentTarget.style.borderColor = "#2a2a2a";
                            }}
                          >
                            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                          </Button>
                        </motion.div>
                      </>
                    )}

                    {/* Footer Links */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                      className="flex flex-wrap items-center justify-center gap-3 pt-4 text-sm"
                      style={{ color: "#888" }}
                    >
                      {mode === "login" ? (
                        <>
                          <button
                            onClick={() => setMode("forgot")}
                            className="font-semibold transition-colors"
                            style={{ color: "#f97316" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ea580c")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#f97316")}
                          >
                            Forgot password?
                          </button>
                          <span>•</span>
                          <span>No account?</span>
                          <button
                            onClick={() => setMode("signup")}
                            className="font-semibold transition-colors"
                            style={{ color: "#f97316" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ea580c")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#f97316")}
                          >
                            Sign up
                          </button>
                        </>
                      ) : mode === "signup" ? (
                        <>
                          <span>Already have an account?</span>
                          <button
                            onClick={() => setMode("login")}
                            className="font-semibold transition-colors"
                            style={{ color: "#f97316" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ea580c")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#f97316")}
                          >
                            Sign in
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setMode("login")}
                          className="font-semibold transition-colors"
                          style={{ color: "#f97316" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#ea580c")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#f97316")}
                        >
                          Back to sign in
                        </button>
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>
        </div>
      </main>
    </div>
  );
}
