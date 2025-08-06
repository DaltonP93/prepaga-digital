
import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SimpleAuthProvider } from "@/components/SimpleAuthProvider";
import { SimpleProtectedRoute } from "@/components/SimpleProtectedRoute";
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
const SimpleLogin = lazy(() => import("@/pages/SimpleLogin"));
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
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
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

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SimpleAuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<AppSkeleton />}>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/login" element={<SimpleLogin />} />
              <Route path="/register" element={<Register />} />
              <Route path="/signature/:token" element={<SignatureView />} />
              <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
              
              {/* Rutas protegidas */}
              <Route path="/" element={
                <SimpleProtectedRoute>
                  <Dashboard />
                </SimpleProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <SimpleProtectedRoute>
                  <Dashboard />
                </SimpleProtectedRoute>
              } />
              <Route path="/sales" element={
                <SimpleProtectedRoute>
                  <Sales />
                </SimpleProtectedRoute>
              } />
              <Route path="/sales/new" element={
                <SimpleProtectedRoute>
                  <NewSale />
                </SimpleProtectedRoute>
              } />
              <Route path="/sales/:id" element={
                <SimpleProtectedRoute>
                  <SaleDetail />
                </SimpleProtectedRoute>
              } />
              <Route path="/request/new" element={
                <SimpleProtectedRoute>
                  <CombinedRequest />
                </SimpleProtectedRoute>
              } />
              <Route path="/clients" element={
                <SimpleProtectedRoute>
                  <Clients />
                </SimpleProtectedRoute>
              } />
              <Route path="/plans" element={
                <SimpleProtectedRoute>
                  <Plans />
                </SimpleProtectedRoute>
              } />
              <Route path="/templates" element={
                <SimpleProtectedRoute>
                  <Templates />
                </SimpleProtectedRoute>
              } />
              <Route path="/users" element={
                <SimpleProtectedRoute>
                  <Users />
                </SimpleProtectedRoute>
              } />
              <Route path="/companies" element={
                <SimpleProtectedRoute>
                  <Companies />
                </SimpleProtectedRoute>
              } />
              <Route path="/documents" element={
                <SimpleProtectedRoute>
                  <Documents />
                </SimpleProtectedRoute>
              } />
              <Route path="/analytics" element={
                <SimpleProtectedRoute>
                  <Analytics />
                </SimpleProtectedRoute>
              } />
              <Route path="/profile" element={
                <SimpleProtectedRoute>
                  <Profile />
                </SimpleProtectedRoute>
              } />
              <Route path="/settings" element={
                <SimpleProtectedRoute>
                  <Settings />
                </SimpleProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SimpleAuthProvider>
    </QueryClientProvider>
  );
};

export default App;
