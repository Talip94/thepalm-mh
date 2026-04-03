import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TenantLayout from "./layouts/TenantLayout";
import AdminLayout from "./layouts/AdminLayout";
import TenantDashboard from "./pages/tenant/TenantDashboard";
import TenantDocuments from "./pages/tenant/TenantDocuments";
import TenantReportIssue from "./pages/tenant/TenantReportIssue";
import TenantIssues from "./pages/tenant/TenantIssues";
import TenantIssueDetail from "./pages/tenant/TenantIssueDetail";
import TenantProfile from "./pages/tenant/TenantProfile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminApartments from "./pages/admin/AdminApartments";
import AdminTenants from "./pages/admin/AdminTenants";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminIssues from "./pages/admin/AdminIssues";
import AdminIssueDetail from "./pages/admin/AdminIssueDetail";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Laden…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (role === 'admin' || role === 'staff') {
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/apartments" element={<AdminLayout><AdminApartments /></AdminLayout>} />
        <Route path="/admin/tenants" element={<AdminLayout><AdminTenants /></AdminLayout>} />
        <Route path="/admin/documents" element={<AdminLayout><AdminDocuments /></AdminLayout>} />
        <Route path="/admin/issues" element={<AdminLayout><AdminIssues /></AdminLayout>} />
        <Route path="/admin/issues/:id" element={<AdminLayout><AdminIssueDetail /></AdminLayout>} />
        <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/tenant" element={<TenantLayout><TenantDashboard /></TenantLayout>} />
      <Route path="/tenant/documents" element={<TenantLayout><TenantDocuments /></TenantLayout>} />
      <Route path="/tenant/report" element={<TenantLayout><TenantReportIssue /></TenantLayout>} />
      <Route path="/tenant/issues" element={<TenantLayout><TenantIssues /></TenantLayout>} />
      <Route path="/tenant/issues/:id" element={<TenantLayout><TenantIssueDetail /></TenantLayout>} />
      <Route path="/tenant/profile" element={<TenantLayout><TenantProfile /></TenantLayout>} />
      <Route path="*" element={<Navigate to="/tenant" replace />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
