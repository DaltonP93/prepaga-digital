
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SimpleAuthProvider } from "@/components/SimpleAuthProvider";
import { CompanyBrandingProvider } from "@/components/CompanyBrandingProvider";
import { SimpleProtectedRoute } from "@/components/SimpleProtectedRoute";
import { SimpleLoginForm } from "@/components/SimpleLoginForm";
import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Sales from "@/pages/Sales";
import NewSale from "@/pages/NewSale";
import SaleDetail from "@/pages/SaleDetail";
import SaleEdit from "@/pages/SaleEdit";
import Clients from "@/pages/Clients";
import Plans from "@/pages/Plans";
import Documents from "@/pages/Documents";
import Templates from "@/pages/Templates";
import TemplateDetail from "@/pages/TemplateDetail";
import TemplateEdit from "@/pages/TemplateEdit";
import SignatureWorkflow from "@/pages/SignatureWorkflow";
import Analytics from "@/pages/Analytics";
import Profile from "@/pages/Profile";
import Users from "@/pages/Users";
import Companies from "@/pages/Companies";
import AuditDashboard from "@/pages/AuditDashboard";
import Experience from "@/pages/Experience";
import NotFound from "@/pages/NotFound";

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
              <Routes>
                <Route path="/login" element={<SimpleLoginForm />} />
                <Route 
                  path="/*" 
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
                  <Route path="users" element={<Users />} />
                  <Route path="companies" element={<Companies />} />
                  <Route path="audit" element={<AuditDashboard />} />
                  <Route path="experience" element={<Experience />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </CompanyBrandingProvider>
        </SimpleAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
