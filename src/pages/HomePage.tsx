import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  BarChart3,
  Users,
  Workflow,
  Clock,
  Star,
  Github,
  Linkedin,
  Mail,
  Menu,
  X,
  ChevronDown,
  Award,
  Lock,
  Database,
  BookOpen,
  Play,
  FileText,
} from "lucide-react";
import { useState } from "react";

export default function HomePage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [email, setEmail] = useState("");

  const features = [
    {
      icon: Workflow,
      title: "Automated Workflows",
      description: "No more manual form filling. Transform documents into smart, interactive workflows.",
    },
    {
      icon: Zap,
      title: "AI-Powered Extraction",
      description: "Automatically extract and populate fields from uploaded documents using advanced AI.",
    },
    {
      icon: CheckCircle2,
      title: "Role-Based Access",
      description: "Faculty and student portals with secure, role-specific permissions and workflows.",
    },
    {
      icon: Clock,
      title: "Deadline Management",
      description: "Built-in deadline tracking, reminders, and automated deadline enforcement.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description: "Track submission status, bottlenecks, and process efficiency in real-time.",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Supabase-backed encryption, role-based access control, and compliance-ready.",
    },
  ];

  const testimonials = [
    {
      author: "Dr. Sarah Mitchell",
      role: "Dean of Students, University of Excellence",
      text: "DocFlow cut our document processing time by 70%. What used to take weeks now happens in days.",
      avatar: "👩‍🎓",
    },
    {
      author: "Prof. James Chen",
      role: "Department Head, Tech Institute",
      text: "The AI extraction feature is a game-changer. No more data entry errors or lost documents.",
      avatar: "👨‍🏫",
    },
    {
      author: "Emily Rodriguez",
      role: "Administrative Coordinator",
      text: "Students love the simplicity. The workflow is intuitive and we get better compliance rates.",
      avatar: "👩‍💼",
    },
  ];

  const useCases = [
    {
      icon: "🎓",
      title: "Admission Processing",
      description: "Automate student application review, document verification, and acceptance workflows.",
    },
    {
      icon: "📋",
      title: "Grade Appeals",
      description: "Streamline grade appeal submissions with automatic document collection and routing.",
    },
    {
      icon: "🔖",
      title: "Scholarship Applications",
      description: "Manage scholarship applications with AI-powered eligibility checking and approvals.",
    },
    {
      icon: "📚",
      title: "Course Registration",
      description: "Simplify course registration with automated document validation and prerequisites.",
    },
  ];

  const pricingTiers = [
    {
      name: "Starter",
      price: "$299",
      period: "/month",
      description: "Perfect for small departments",
      features: [
        "Up to 5 users",
        "1,000 documents/month",
        "AI extraction",
        "Role-based access",
        "Email support",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Professional",
      price: "$799",
      period: "/month",
      description: "For growing institutions",
      features: [
        "Up to 50 users",
        "10,000 documents/month",
        "AI extraction",
        "Advanced analytics",
        "Custom workflows",
        "Priority support",
        "API access",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "Contact us",
      description: "For large universities",
      features: [
        "Unlimited users",
        "Unlimited documents",
        "Everything in Pro",
        "Dedicated support",
        "Custom integrations",
        "On-premise option",
        "SLA guarantee",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  const faqs = [
    {
      question: "Is our institution data secure?",
      answer: "Yes. DocFlow uses enterprise-grade encryption with Supabase backend, SOC 2 Type II compliance, and GDPR-ready architecture. All data is encrypted in transit and at rest.",
    },
    {
      question: "How long does setup take?",
      answer: "Typical setup is 2-4 weeks. We provide dedicated onboarding, staff training, and custom workflow configuration to ensure smooth adoption.",
    },
    {
      question: "Can DocFlow integrate with our existing systems?",
      answer: "Absolutely. DocFlow integrates via API with most LMS, ERP, and HR systems. We also offer Zapier integration for no-code automations.",
    },
    {
      question: "What kind of support do you provide?",
      answer: "We offer email support (Starter), priority support (Pro), and 24/7 dedicated support (Enterprise). All tiers include detailed documentation and video tutorials.",
    },
    {
      question: "Can we customize workflows for our institution?",
      answer: "Yes! Professional and Enterprise tiers include custom workflow design. Our team works with you to map your exact processes into DocFlow.",
    },
    {
      question: "What about compliance (FERPA, GDPR, etc.)?",
      answer: "DocFlow is built FERPA-compliant and GDPR-ready. Enterprise customers get additional compliance features and audit logs.",
    },
  ];

  const stats = [
    { number: "500+", label: "Documents Processed Daily" },
    { number: "200+", label: "Institutions Trusted" },
    { number: "99.9%", label: "Uptime Guarantee" },
    { number: "70%", label: "Avg. Time Saved" },
  ];

  const integrations = [
    { name: "Supabase", icon: "🗄️" },
    { name: "Zapier", icon: "⚡" },
    { name: "Canvas", icon: "📚" },
    { name: "Blackboard", icon: "🎯" },
    { name: "Salesforce", icon: "☁️" },
    { name: "Google Workspace", icon: "📧" },
  ];

  const resources = [
    {
      icon: BookOpen,
      title: "Case Study: 70% Time Reduction",
      description: "How University of Excellence cut processing time from 3 weeks to 5 days.",
      link: "#",
    },
    {
      icon: Play,
      title: "Product Demo (5 min)",
      description: "See DocFlow in action with a live walkthrough of key features.",
      link: "#",
    },
    {
      icon: FileText,
      title: "Security & Compliance Guide",
      description: "Learn how DocFlow meets FERPA, GDPR, and SOC 2 requirements.",
      link: "#",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: "#0f0f0f" }}>
      {/* Background Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full blur-3xl animate-pulse" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)" }} />
        <div className="absolute top-1/4 -right-48 h-96 w-96 rounded-full blur-3xl animate-pulse" style={{ background: "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)", animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(15, 15, 15, 0.95)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "linear-gradient(to br, #f97316, #ea580c)" }}>
              <Sparkles className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="font-display text-2xl font-bold" style={{ color: "#ffffff" }}>DocFlow</h1>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" style={{ color: "#d0d0d0" }} className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" style={{ color: "#d0d0d0" }} className="hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" style={{ color: "#d0d0d0" }} className="hover:text-white transition-colors">Testimonials</a>
            <a href="#faq" style={{ color: "#d0d0d0" }} className="hover:text-white transition-colors">FAQ</a>
            <a href="#about" style={{ color: "#d0d0d0" }} className="hover:text-white transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/auth")} className="px-6 py-2 rounded-lg border transition-all" style={{ borderColor: "#2a2a2a", color: "#f97316" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(26, 26, 26, 1)")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>Sign In</button>
            <button onClick={() => navigate("/auth")} className="px-6 py-2 rounded-lg text-white font-semibold transition-all" style={{ background: "linear-gradient(to right, #f97316, #ea580c)", boxShadow: "0 0 20px rgba(249, 115, 22, 0.3)" }} onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(249, 115, 22, 0.5)")} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 20px rgba(249, 115, 22, 0.3)")}>Get Started</button>
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X className="h-6 w-6" style={{ color: "#ffffff" }} /> : <Menu className="h-6 w-6" style={{ color: "#ffffff" }} />}</button>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="inline-flex items-center gap-2 rounded-full border mb-8 px-4 py-2" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(26, 26, 26, 0.5)" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
              <span style={{ color: "#e0e0e0", fontSize: "14px", fontWeight: "500" }}>Trusted by 200+ academic institutions</span>
            </motion.div>

            <h1 className="font-display text-6xl md:text-7xl font-bold mb-6 leading-tight" style={{ color: "#ffffff" }}>Transform Academic Document Management</h1>

            <p className="text-xl md:text-2xl mb-12 leading-relaxed" style={{ color: "#d0d0d0" }}>DocFlow automates document collection, AI-powered extraction, faculty review, and student submissions — turning chaos into clarity.</p>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-col md:flex-row gap-4 justify-center">
              <button onClick={() => navigate("/auth")} className="px-8 py-4 rounded-lg text-white font-semibold transition-all" style={{ background: "linear-gradient(to right, #f97316, #ea580c)", boxShadow: "0 0 20px rgba(249, 115, 22, 0.3)" }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 30px rgba(249, 115, 22, 0.5)"; e.currentTarget.style.transform = "scale(1.02)"; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(249, 115, 22, 0.3)"; e.currentTarget.style.transform = "scale(1)"; }}>Start Free Trial <ArrowRight className="ml-2 h-5 w-5 inline" /></button>
              <button className="px-8 py-4 rounded-lg border font-semibold transition-all" style={{ borderColor: "#2a2a2a", color: "#f97316" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(26, 26, 26, 1)")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>Watch Demo</button>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="mt-20 rounded-2xl border p-1 overflow-hidden" style={{ borderColor: "#2a2a2a" }}>
            <div className="w-full h-96 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(26, 26, 26, 0.5)" }}>
              <div className="text-center">
                <BarChart3 className="h-16 w-16 mx-auto mb-4" style={{ color: "#f97316" }} />
                <p style={{ color: "#888" }}>Dashboard Preview</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Stats Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="text-center">
                <h3 className="font-display text-5xl font-bold mb-2" style={{ color: "#f97316" }}>{stat.number}</h3>
                <p style={{ color: "#888" }}>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-16">
            <h2 className="font-display text-5xl font-bold mb-4" style={{ color: "#ffffff" }}>Why DocFlow Stands Out</h2>
            <p style={{ color: "#d0d0d0", fontSize: "18px" }}>Six powerful features designed specifically for academic institutions</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="rounded-xl border p-8 transition-all cursor-pointer" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(26, 26, 26, 0.5)" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; e.currentTarget.style.backgroundColor = "rgba(34, 34, 34, 0.8)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.backgroundColor = "rgba(26, 26, 26, 0.5)"; }}>
                  <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(249, 115, 22, 0.2)" }}>
                    <Icon className="h-6 w-6" style={{ color: "#f97316" }} />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-3" style={{ color: "#ffffff" }}>{feature.title}</h3>
                  <p style={{ color: "#aaa", lineHeight: "1.6" }}>{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-16">
            <h2 className="font-display text-5xl font-bold mb-4" style={{ color: "#ffffff" }}>Works Across All Departments</h2>
            <p style={{ color: "#d0d0d0", fontSize: "18px" }}>Adaptable to any academic workflow</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {useCases.map((useCase, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="rounded-xl border p-8" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(26, 26, 26, 0.5)" }}>
                <div style={{ fontSize: "40px", marginBottom: "16px" }}>{useCase.icon}</div>
                <h3 className="font-display text-2xl font-semibold mb-3" style={{ color: "#ffffff" }}>{useCase.title}</h3>
                <p style={{ color: "#aaa", lineHeight: "1.6" }}>{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-16 text-center">
            <h2 className="font-display text-5xl font-bold mb-4" style={{ color: "#ffffff" }}>Simple, Transparent Pricing</h2>
            <p style={{ color: "#d0d0d0", fontSize: "18px" }}>Choose the plan that fits your institution</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="rounded-xl border p-8 transition-all relative" style={{ borderColor: tier.popular ? "#f97316" : "#2a2a2a", backgroundColor: tier.popular ? "rgba(249, 115, 22, 0.1)" : "rgba(26, 26, 26, 0.5)" }}>
                {tier.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold" style={{ background: "linear-gradient(to right, #f97316, #ea580c)", color: "#ffffff" }}>Most Popular</div>}
                <h3 className="font-display text-2xl font-bold mb-2" style={{ color: "#ffffff" }}>{tier.name}</h3>
                <p style={{ color: "#888", marginBottom: "16px" }}>{tier.description}</p>
                <div className="mb-6">
                  <span className="font-display text-4xl font-bold" style={{ color: "#f97316" }}>{tier.price}</span>
                  <span style={{ color: "#888" }}>{tier.period}</span>
                </div>
                <button onClick={() => navigate("/auth")} className="w-full py-3 rounded-lg font-semibold transition-all mb-8" style={{ background: tier.popular ? "linear-gradient(to right, #f97316, #ea580c)" : "transparent", color: tier.popular ? "#ffffff" : "#f97316", border: tier.popular ? "none" : "1px solid #2a2a2a" }} onMouseEnter={(e) => { if (!tier.popular) e.currentTarget.style.backgroundColor = "rgba(26, 26, 26, 1)"; }} onMouseLeave={(e) => { if (!tier.popular) e.currentTarget.style.backgroundColor = "transparent"; }}>{tier.cta}</button>
                <ul className="space-y-3">
                  {tier.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5" style={{ color: "#22c55e" }} />
                      <span style={{ color: "#d0d0d0" }}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-16 text-center">
            <h2 className="font-display text-5xl font-bold mb-4" style={{ color: "#ffffff" }}>How DocFlow Compares</h2>
            <p style={{ color: "#d0d0d0", fontSize: "18px" }}>Better than manual processes and generic tools</p>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderColor: "#2a2a2a" }}>
                  <td className="px-6 py-4 font-semibold" style={{ color: "#ffffff" }}>Feature</td>
                  <td className="px-6 py-4 font-semibold text-center" style={{ color: "#d0d0d0" }}>Manual Process</td>
                  <td className="px-6 py-4 font-semibold text-center" style={{ color: "#d0d0d0" }}>Generic Tools</td>
                  <td className="px-6 py-4 font-semibold text-center" style={{ color: "#f97316" }}>DocFlow</td>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "AI Extraction", manual: "✗", generic: "✗", docflow: "✓" },
                  { feature: "Role-Based Access", manual: "✗", generic: "✗", docflow: "✓" },
                  { feature: "Deadline Automation", manual: "✗", generic: "✗", docflow: "✓" },
                  { feature: "Real-Time Analytics", manual: "✗", generic: "✗", docflow: "✓" },
                  { feature: "Academic Workflows", manual: "✗", generic: "✗", docflow: "✓" },
                  { feature: "Time Saved", manual: "0%", generic: "30%", docflow: "70%" },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderTop: "1px solid #2a2a2a" }}>
                    <td className="px-6 py-4" style={{ color: "#ffffff" }}>{row.feature}</td>
                    <td className="px-6 py-4 text-center" style={{ color: "#888" }}>{row.manual}</td>
                    <td className="px-6 py-4 text-center" style={{ color: "#888" }}>{row.generic}</td>
                    <td className="px-6 py-4 text-center" style={{ color: "#22c55e", fontWeight: "600" }}>{row.docflow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Product Demo */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-16 text-center">
            <h2 className="font-display text-5xl font-bold mb-4" style={{ color: "#ffffff" }}>See DocFlow in Action</h2>
            <p style={{ color: "#d0d0d0", fontSize: "18px" }}>Watch a 3-minute demo of the complete workflow</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="rounded-2xl border p-2 overflow-hidden" style={{ borderColor: "#2a2a2a" }}>
            <div className="w-full h-96 md:h-[500px] rounded-xl flex items-center justify-center relative" style={{ backgroundColor: "rgba(26, 26, 26, 0.5)" }}>
              <div className="text-center">
                <div className="mb-6 flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full cursor-pointer transition-all" style={{ background: "linear-gradient(to right, #f97316, #ea580c)", boxShadow: "0 0 30px rgba(249, 115, 22, 0.4)" }} onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 50px rgba(249, 115, 22, 0.6)")} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(249, 115, 22, 0.4)")}>
                    <ArrowRight className="h-10 w-10 text-white ml-2" />
                  </div>
                </div>
                <p style={{ color: "#888", fontSize: "18px" }}>Click to watch the demo</p>
                <p style={{ color: "#666", fontSize: "14px", marginTop: "8px" }}>YouTube video embed coming soon</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-16">
            <h2 className="font-display text-5xl font-bold mb-4" style={{ color: "#ffffff" }}>Loved by Academic Leaders</h2>
            <p style={{ color: "#d0d0d0", fontSize: "18px" }}>See what faculty and administrators are saying about DocFlow</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="rounded-xl border p-8" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(26, 26, 26, 0.5)" }}>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4" style={{ color: "#f97316", fill: "#f97316" }} />
                  ))}
                </div>
                <p className="mb-6" style={{ color: "#d0d0d0", fontSize: "16px", lineHeight: "1.6" }}>"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div style={{ fontSize: "32px" }}>{testimonial.avatar}</div>
                  <div>
                    <p style={{ color: "#ffffff", fontWeight: "600" }}>{testimonial.author}</p>
                    <p style={{ color: "#888", fontSize: "14px" }}>{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-16 text-center">
            <h2 className="font-display text-5xl font-bold mb-4" style={{ color: "#ffffff" }}>Frequently Asked Questions</h2>
            <p style={{ color: "#d0d0d0", fontSize: "18px" }}>Everything you need to know about DocFlow</p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.05 }} className="rounded-lg border overflow-hidden" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(26, 26, 26, 0.5)" }}>
                <button onClick={() => setActiveFaq(activeFaq === idx ? null : idx)} className="w-full px-6 py-4 flex justify-between items-center transition-colors" style={{ color: "#ffffff" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(34, 34, 34, 0.8)")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <span className="font-semibold text-left">{faq.question}</span>
                  <ChevronDown className="h-5 w-5 transition-transform" style={{ transform: activeFaq === idx ? "rotate(180deg)" : "rotate(0deg)", color: "#f97316" }} />
                </button>
                {activeFaq === idx && (
                  <div className="px-6 pb-4 border-t" style={{ borderColor: "#2a2a2a", color: "#d0d0d0" }}>
                    {faq.answer}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Trust & Security */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-16 text-center">
            <h2 className="font-display text-5xl font-bold mb-4" style={{ color: "#ffffff" }}>Enterprise-Grade Security</h2>
            <p style={{ color: "#d0d0d0", fontSize: "18px" }}>Your data is secure, compliant, and always available</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Lock, title: "SOC 2 Type II", description: "Independent security audits and certification" },
              { icon: Shield, title: "FERPA Compliant", description: "Meets all federal education privacy laws" },
              { icon: Database, title: "Encrypted Data", description: "Military-grade encryption in transit and at rest" },
              { icon: Award, title: "99.9% Uptime", description: "Enterprise-grade SLA and redundancy" },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="text-center">
                  <div className="h-12 w-12 rounded-lg flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "rgba(249, 115, 22, 0.2)" }}>
                    <Icon className="h-6 w-6" style={{ color: "#f97316" }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: "#ffffff" }}>{item.title}</h3>
                  <p style={{ color: "#888", fontSize: "14px" }}>{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Integrations */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-16 text-center">
            <h2 className="font-display text-5xl font-bold mb-4" style={{ color: "#ffffff" }}>Integrates with Tools You Love</h2>
            <p style={{ color: "#d0d0d0", fontSize: "18px" }}>Works seamlessly with your existing tech stack</p>
          </motion.div>

          <div className="grid md:grid-cols-6 gap-8">
            {integrations.map((integration, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.05 }} className="rounded-lg border p-6 flex flex-col items-center justify-center text-center" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(26, 26, 26, 0.5)" }}>
                <div style={{ fontSize: "40px", marginBottom: "8px" }}>{integration.icon}</div>
                <p style={{ color: "#ffffff", fontWeight: "500" }}>{integration.name}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Resources */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-16 text-center">
            <h2 className="font-display text-5xl font-bold mb-4" style={{ color: "#ffffff" }}>Resources & Learning</h2>
            <p style={{ color: "#d0d0d0", fontSize: "18px" }}>Get started with guides, demos, and case studies</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {resources.map((resource, idx) => {
              const Icon = resource.icon;
              return (
                <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="rounded-xl border p-8 group cursor-pointer transition-all" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(26, 26, 26, 0.5)" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; e.currentTarget.style.backgroundColor = "rgba(34, 34, 34, 0.8)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.backgroundColor = "rgba(26, 26, 26, 0.5)"; }}>
                  <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(249, 115, 22, 0.2)" }}>
                    <Icon className="h-6 w-6" style={{ color: "#f97316" }} />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-3" style={{ color: "#ffffff" }}>{resource.title}</h3>
                  <p style={{ color: "#aaa", marginBottom: "16px", lineHeight: "1.6" }}>{resource.description}</p>
                  <a href={resource.link} style={{ color: "#f97316", fontWeight: "600" }}>Learn More →</a>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Newsletter */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="rounded-2xl border p-12 text-center" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(26, 26, 26, 0.3)" }}>
            <h2 className="font-display text-4xl font-bold mb-4" style={{ color: "#ffffff" }}>Stay Updated</h2>
            <p className="mb-8" style={{ color: "#d0d0d0", fontSize: "18px" }}>Get tips, features updates, and case studies delivered to your inbox</p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input type="email" placeholder="your@institution.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 px-6 py-3 rounded-lg border" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(15, 15, 15, 0.8)", color: "#ffffff" }} />
              <button className="px-8 py-3 rounded-lg text-white font-semibold transition-all" style={{ background: "linear-gradient(to right, #f97316, #ea580c)", boxShadow: "0 0 20px rgba(249, 115, 22, 0.3)" }} onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(249, 115, 22, 0.5)")} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 20px rgba(249, 115, 22, 0.3)")}>Subscribe</button>
            </div>
          </motion.div>
        </section>

        {/* About Author */}
        <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-5xl font-bold mb-6" style={{ color: "#ffffff" }}>Meet Tarun Kumar Makode</h2>
              <p className="mb-4 text-lg" style={{ color: "#d0d0d0", lineHeight: "1.8" }}>I'm a full-stack developer passionate about solving real-world problems in academic institutions. After working with multiple universities, I saw the massive pain point in document management — inefficient, error-prone, and frustrating for both staff and students.</p>
              <p className="mb-6 text-lg" style={{ color: "#d0d0d0", lineHeight: "1.8" }}>DocFlow was born from that frustration. It's built with modern technology (React, TypeScript, Supabase, AI extraction) to deliver a seamless experience that respects the complexity of academic workflows while keeping the UI simple and intuitive.</p>
              <p style={{ color: "#d0d0d0", lineHeight: "1.8" }}>My mission: <span style={{ color: "#f97316", fontWeight: "600" }}>"Make academic processes frictionless so institutions can focus on education."</span></p>

              <div className="flex gap-4 mt-8">
                <a href="https://github.com" className="h-10 w-10 rounded-lg border flex items-center justify-center transition-all cursor-pointer" style={{ borderColor: "#2a2a2a" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f97316"; e.currentTarget.style.borderColor = "#f97316"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#2a2a2a"; }}>
                  <Github className="h-5 w-5" style={{ color: "#f97316" }} />
                </a>
                <a href="https://linkedin.com" className="h-10 w-10 rounded-lg border flex items-center justify-center transition-all cursor-pointer" style={{ borderColor: "#2a2a2a" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f97316"; e.currentTarget.style.borderColor = "#f97316"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#2a2a2a"; }}>
                  <Linkedin className="h-5 w-5" style={{ color: "#f97316" }} />
                </a>
                <a href="mailto:tarun@docflow.io" className="h-10 w-10 rounded-lg border flex items-center justify-center transition-all cursor-pointer" style={{ borderColor: "#2a2a2a" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f97316"; e.currentTarget.style.borderColor = "#f97316"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#2a2a2a"; }}>
                  <Mail className="h-5 w-5" style={{ color: "#f97316" }} />
                </a>
              </div>
            </div>

            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="rounded-2xl border p-8 flex items-center justify-center h-96" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(26, 26, 26, 0.5)" }}>
              <div className="text-center">
                <div style={{ fontSize: "80px", marginBottom: "16px" }}>👨‍💻</div>
                <p style={{ color: "#ffffff", fontWeight: "600" }}>Tarun Kumar Makode</p>
                <p style={{ color: "#888", fontSize: "14px" }}>Full-Stack Developer & Founder</p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Final CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t" style={{ borderColor: "#2a2a2a" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center rounded-2xl border p-12" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(26, 26, 26, 0.3)" }}>
            <h2 className="font-display text-5xl font-bold mb-6" style={{ color: "#ffffff" }}>Ready to Transform Your Institution?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: "#d0d0d0" }}>Join 200+ institutions already using DocFlow. Start your free trial today — no credit card required.</p>
            <button onClick={() => navigate("/auth")} className="px-8 py-4 rounded-lg text-white font-semibold transition-all" style={{ background: "linear-gradient(to right, #f97316, #ea580c)", boxShadow: "0 0 20px rgba(249, 115, 22, 0.3)" }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 30px rgba(249, 115, 22, 0.5)"; e.currentTarget.style.transform = "scale(1.02)"; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(249, 115, 22, 0.3)"; e.currentTarget.style.transform = "scale(1)"; }}>Get Started Now <ArrowRight className="ml-2 h-5 w-5 inline" /></button>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t mt-20" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(15, 15, 15, 0.95)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "linear-gradient(to br, #f97316, #ea580c)" }}>
                  <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="font-display text-lg font-bold" style={{ color: "#ffffff" }}>DocFlow</span>
              </div>
              <p style={{ color: "#888", fontSize: "14px" }}>Transforming academic document management.</p>
            </div>

            <div>
              <h4 className="font-semibold mb-4" style={{ color: "#ffffff" }}>Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" style={{ color: "#888" }} className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" style={{ color: "#888" }} className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" style={{ color: "#888" }} className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4" style={{ color: "#ffffff" }}>Company</h4>
              <ul className="space-y-2">
                <li><a href="#about" style={{ color: "#888" }} className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" style={{ color: "#888" }} className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" style={{ color: "#888" }} className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4" style={{ color: "#ffffff" }}>Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" style={{ color: "#888" }} className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" style={{ color: "#888" }} className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8" style={{ borderColor: "#2a2a2a" }}>
            <p style={{ color: "#666", textAlign: "center", fontSize: "14px" }}>© 2026 DocFlow. Built by Tarun Kumar Makode. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
