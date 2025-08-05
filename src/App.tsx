
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import RequireAuth from "@/components/RequireAuth";

// Lazy loading de componentes
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Sales = lazy(() => import("@/pages/Sales"));
const NewSale = lazy(() => import("@/pages/NewSale"));
const SaleDetail = lazy(() => import("@/pages/SaleDetail"));
const CombinedRequest = lazy(() => import("@/pages/CombinedRequest"));
const Clients = lazy(() => import("@/pages/Clients"));
const Plans = lazy(() => import("@/pages/Plans"));
const Templates = lazy(() => import("@/pages/Templates"));
const Users = lazy(() => import("@/pages/Users"));
const Companies = lazy(() => import("@/pages/Companies"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Profile = lazy(() => import("@/pages/Profile"));
const Settings = lazy(() => import("@/pages/Settings"));
const SignatureView = lazy(() => import("@/pages/SignatureView"));
const QuestionnaireView = lazy(() => import("@/pages/QuestionnaireView"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div>Cargando...</div>}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/signature/:token" element={<SignatureView />} />
                <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
                
                <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/sales" element={<RequireAuth><Sales /></RequireAuth>} />
                <Route path="/sales/new" element={<RequireAuth><NewSale /></RequireAuth>} />
                <Route path="/sales/:id" element={<RequireAuth><SaleDetail /></RequireAuth>} />
                <Route path="/request/new" element={<RequireAuth><CombinedRequest /></RequireAuth>} />
                <Route path="/clients" element={<RequireAuth><Clients /></RequireAuth>} />
                <Route path="/plans" element={<RequireAuth><Plans /></RequireAuth>} />
                <Route path="/templates" element={<RequireAuth><Templates /></RequireAuth>} />
                <Route path="/users" element={<RequireAuth><Users /></RequireAuth>} />
                <Route path="/companies" element={<RequireAuth><Companies /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
