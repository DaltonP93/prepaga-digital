
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SimpleAuthProvider } from "@/components/SimpleAuthProvider";
import { CompanyBrandingProvider } from "@/components/CompanyBrandingProvider";

// Lazy-load components not needed for initial login page render
const SimpleProtectedRoute = lazy(() => import("@/components/SimpleProtectedRoute").then(m => ({ default: m.SimpleProtectedRoute })));
const RoleProtectedRoute = lazy(() => import("@/components/RoleProtectedRoute").then(m => ({ default: m.RoleProtectedRoute })));
const SimpleLoginForm = lazy(() => import("@/components/SimpleLoginForm"));
const MainLayout = lazy(() => import("@/layouts/MainLayout"));

// Lazy-loaded pages for code splitting — reduces initial bundle size
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Sales = lazy(() => import("@/pages/Sales"));
const NewSale = lazy(() => import("@/pages/NewSale"));
const SaleDetail = lazy(() => import("@/pages/SaleDetail"));
const SaleEdit = lazy(() => import("@/pages/SaleEdit"));
const Clients = lazy(() => import("@/pages/Clients"));
const Plans = lazy(() => import("@/pages/Plans"));
const Documents = lazy(() => import("@/pages/Documents"));
const Templates = lazy(() => import("@/pages/Templates"));
const TemplateDetail = lazy(() => import("@/pages/TemplateDetail"));
const TemplateEdit = lazy(() => import("@/pages/TemplateEdit"));
const SignatureWorkflow = lazy(() => import("@/pages/SignatureWorkflow"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Profile = lazy(() => import("@/pages/Profile"));
const Users = lazy(() => import("@/pages/Users"));
const Companies = lazy(() => import("@/pages/Companies"));
const AuditDashboard = lazy(() => import("@/pages/AuditDashboard"));
const Experience = lazy(() => import("@/pages/Experience"));
const Settings = lazy(() => import("@/pages/Settings"));
const SignatureView = lazy(() => import("@/pages/SignatureView"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Crear cliente de React Query con configuración optimizada
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SimpleAuthProvider>
          <CompanyBrandingProvider>
            <Toaster />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<SimpleLoginForm />} />
                <Route path="/firmar/:token" element={<SignatureView />} />
                
                {/* Protected routes */}
                <Route
                  element={
                    <SimpleProtectedRoute>
                      <MainLayout />
                    </SimpleProtectedRoute>
                  } 
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="sales" element={<Sales />} />
                  <Route path="sales/new" element={<NewSale />} />
                  <Route path="sales/:id" element={<SaleDetail />} />
                  <Route path="sales/:id/edit" element={<SaleEdit />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="plans" element={<Plans />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="templates" element={<Templates />} />
                  <Route path="templates/:id" element={<TemplateDetail />} />
                  <Route path="templates/:id/edit" element={<TemplateEdit />} />
                  <Route path="signature-workflow" element={<SignatureWorkflow />} />
                  <Route path="signature-workflow/:saleId" element={<SignatureWorkflow />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="profile" element={<Profile />} />
                  <Route
                    path="users"
                    element={
                      <RoleProtectedRoute allowedRoles={['super_admin', 'admin', 'supervisor']}>
                        <Users />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="companies"
                    element={
                      <RoleProtectedRoute allowedRoles={['super_admin']}>
                        <Companies />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route
                    path="audit"
                    element={
                      <RoleProtectedRoute allowedRoles={['super_admin', 'admin', 'supervisor', 'auditor']}>
                        <AuditDashboard />
                      </RoleProtectedRoute>
                    }
                  />
                  <Route path="settings" element={<Settings />} />
                  <Route path="experience" element={<Experience />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </CompanyBrandingProvider>
        </SimpleAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
