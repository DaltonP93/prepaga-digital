import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SimpleAuthProvider } from "@/components/SimpleAuthProvider";
import { SimpleProtectedRoute } from "@/components/SimpleProtectedRoute";
import { SessionTimeoutProvider } from "@/components/SessionTimeoutProvider";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import SaleEdit from "./pages/SaleEdit";
import SaleDetail from "./pages/SaleDetail";
import SaleForm from "./pages/SaleForm";
import Clients from "./pages/Clients";
import Plans from "./pages/Plans";
import Documents from "./pages/Documents";
import Templates from "./pages/Templates";
import SignatureWorkflow from "./pages/SignatureWorkflow";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Users from "./pages/Users";
import Companies from "./pages/Companies";
import AuditDashboard from "./pages/AuditDashboard";
import Communications from "./pages/Communications";
import FileManagement from "./pages/FileManagement";
import Experience from "./pages/Experience";
import SimpleDashboard from "./pages/SimpleDashboard";
import SimpleLogin from "./pages/SimpleLogin";
import QuestionnaireView from "./pages/QuestionnaireView";
import SignatureView from "./pages/SignatureView";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
            <Route path="/signature/:token" element={<SignatureView />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/canceled" element={<PaymentCanceled />} />
            
            {/* Simple auth routes */}
            <Route path="/simple-login" element={<SimpleLogin />} />
            <Route path="/simple-dashboard" element={
              <SimpleAuthProvider>
                <SimpleProtectedRoute>
                  <SimpleDashboard />
                </SimpleProtectedRoute>
              </SimpleAuthProvider>
            } />
            
            {/* Protected routes */}
            <Route path="/" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />
            
            <Route path="/dashboard" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />
            
            <Route path="/sales" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <Sales />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />
            
            <Route path="/sales/edit/:id" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <SaleEdit />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />
            
            <Route path="/sales/new" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <SaleForm />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />
            
            <Route path="/sales/:id" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <SaleDetail />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />

            <Route path="/clients" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <Clients />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />

            <Route path="/plans" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <Plans />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />

            <Route path="/documents" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <Documents />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />

            <Route path="/templates" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <Templates />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />

            <Route path="/signature-workflow" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <SignatureWorkflow />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />

            <Route path="/analytics" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />

            <Route path="/profile" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />

            <Route path="/users" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute requiredRole={['super_admin', 'admin']}>
                    <Users />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />

            <Route path="/companies" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute requiredRole={['super_admin', 'admin']}>
                    <Companies />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />

            <Route path="/audit" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute requiredRole={['super_admin', 'admin']}>
                    <AuditDashboard />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />

            <Route path="/communications" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <Communications />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />

            <Route path="/files" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <FileManagement />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />

            <Route path="/experience" element={
              <AuthProvider>
                <SessionTimeoutProvider>
                  <ProtectedRoute>
                    <Experience />
                  </ProtectedRoute>
                </SessionTimeoutProvider>
              </AuthProvider>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
