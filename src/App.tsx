
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SimpleAuthProvider } from "@/components/SimpleAuthProvider";
import { CompanyBrandingProvider } from "@/components/CompanyBrandingProvider";

// Helper: retry dynamic imports once then force-reload on chunk errors
function lazyRetry(importFn: () => Promise<any>) {
  return lazy(() =>
    importFn().catch((error) => {
      // If chunk failed to load, reload the page once
      const hasReloaded = sessionStorage.getItem('chunk_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        return new Promise(() => {}); // never resolves, page will reload
      }
      sessionStorage.removeItem('chunk_reload');
      throw error;
    })
  );
}

// Lazy-load components not needed for initial login page render
const SimpleProtectedRoute = lazyRetry(() => import("@/components/SimpleProtectedRoute").then(m => ({ default: m.SimpleProtectedRoute })));
const RoleProtectedRoute = lazyRetry(() => import("@/components/RoleProtectedRoute").then(m => ({ default: m.RoleProtectedRoute })));
const SimpleLoginForm = lazyRetry(() => import("@/components/SimpleLoginForm"));
const MainLayout = lazyRetry(() => import("@/layouts/MainLayout"));

// Lazy-loaded pages for code splitting — reduces initial bundle size
const Dashboard = lazyRetry(() => import("@/pages/Dashboard"));
const Sales = lazyRetry(() => import("@/pages/Sales"));
const NewSale = lazyRetry(() => import("@/pages/NewSale"));
const SaleDetail = lazyRetry(() => import("@/pages/SaleDetail"));
const SaleEdit = lazyRetry(() => import("@/pages/SaleEdit"));
const Clients = lazyRetry(() => import("@/pages/Clients"));
const Plans = lazyRetry(() => import("@/pages/Plans"));
const Documents = lazyRetry(() => import("@/pages/Documents"));
const Templates = lazyRetry(() => import("@/pages/Templates"));
const TemplateDetail = lazyRetry(() => import("@/pages/TemplateDetail"));
const TemplateEdit = lazyRetry(() => import("@/pages/TemplateEdit"));
const SignatureWorkflow = lazyRetry(() => import("@/pages/SignatureWorkflow"));
const Analytics = lazyRetry(() => import("@/pages/Analytics"));
const Profile = lazyRetry(() => import("@/pages/Profile"));
const Users = lazyRetry(() => import("@/pages/Users"));
const Companies = lazyRetry(() => import("@/pages/Companies"));
const AuditDashboard = lazyRetry(() => import("@/pages/AuditDashboard"));
const Experience = lazyRetry(() => import("@/pages/Experience"));
const Settings = lazyRetry(() => import("@/pages/Settings"));
const SignatureView = lazyRetry(() => import("@/pages/SignatureView"));
const SignaturePolicy = lazyRetry(() => import("@/pages/SignaturePolicy"));
const NotFound = lazyRetry(() => import("@/pages/NotFound"));

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
                <Route path="/politica-firma" element={<SignaturePolicy />} />
                
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
