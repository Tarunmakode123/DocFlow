import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/layout/AdminLayout";
import StudentLayout from "@/components/layout/StudentLayout";
import HomePage from "@/pages/HomePage";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/NotFound";

// Admin pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUpload from "@/pages/admin/AdminUpload";
import AdminTemplates from "@/pages/admin/AdminTemplates";
import AdminTemplateDetail from "@/pages/admin/AdminTemplateDetail";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminSubmissions from "@/pages/admin/AdminSubmissions";
import AdminBulkMessaging from "@/pages/admin/AdminBulkMessaging";

// Student pages
import StudentDashboard from "@/pages/student/StudentDashboard";
import StudentFill from "@/pages/student/StudentFill";
import StudentFillTemplate from "@/pages/student/StudentFillTemplate";
import StudentPreview from "@/pages/student/StudentPreview";
import StudentCompleted from "@/pages/student/StudentCompleted";
import StudentProfile from "@/pages/student/StudentProfile";
import StudentSettings from "@/pages/student/StudentSettings";
import StudentMessagesPage from "@/pages/student/StudentMessages";

const queryClient = new QueryClient();

function RoleRedirect() {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (role === "student") return <Navigate to="/student/dashboard" replace />;
  return <HomePage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Admin Routes */}
            <Route
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/upload" element={<AdminUpload />} />
              <Route path="/admin/templates" element={<AdminTemplates />} />
              <Route path="/admin/templates/:id" element={<AdminTemplateDetail />} />
              <Route path="/admin/submissions" element={<AdminSubmissions />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/messaging" element={<AdminBulkMessaging />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* Student Routes */}
            <Route
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/fill" element={<StudentFill />} />
              <Route path="/student/fill/:templateId" element={<StudentFillTemplate />} />
              <Route path="/student/preview/:templateId" element={<StudentPreview />} />
              <Route path="/student/completed" element={<StudentCompleted />} />
              <Route path="/student/messages" element={<StudentMessagesPage />} />
              <Route path="/student/profile" element={<StudentProfile />} />
              <Route path="/student/settings" element={<StudentSettings />} />
            </Route>

            {/* Legacy redirects */}
            <Route path="/dashboard" element={<RoleRedirect />} />
            <Route path="/upload" element={<Navigate to="/admin/upload" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
