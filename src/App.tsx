
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import RequireAuth from "@/components/RequireAuth";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy loading de componentes principales
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
const Documents = lazy(() => import("@/pages/Documents"));
const Analytics = lazy(() => import("@/pages/Analytics"));

// Cliente optimizado de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
    },
    mutations: {
      retry: 1,
    },
  },
});

// Componente de carga general
const AppSkeleton = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md mx-auto p-4">
      <Skeleton className="h-8 w-3/4 mx-auto" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-10 w-full mt-8" />
    </div>
  </div>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<AppSkeleton />}>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/signature/:token" element={<SignatureView />} />
              <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
              
              {/* Rutas protegidas */}
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
              <Route path="/documents" element={<RequireAuth><Documents /></RequireAuth>} />
              <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
