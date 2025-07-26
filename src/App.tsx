
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
          <SimpleAuthProvider>
            <SessionTimeoutProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
                <Route path="/signature/:token" element={<SignatureView />} />
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/canceled" element={<PaymentCanceled />} />
                
                {/* Simple auth routes - legacy */}
                <Route path="/simple-login" element={<SimpleLogin />} />
                <Route path="/simple-dashboard" element={
                  <SimpleProtectedRoute>
                    <SimpleDashboard />
                  </SimpleProtectedRoute>
                } />
                
                {/* Protected routes - ahora todos usan SimpleAuthProvider */}
                <Route path="/" element={
                  <SimpleProtectedRoute>
                    <Index />
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
                
                <Route path="/sales/edit/:id" element={
                  <SimpleProtectedRoute>
                    <SaleEdit />
                  </SimpleProtectedRoute>
                } />
                
                <Route path="/sales/new" element={
                  <SimpleProtectedRoute>
                    <SaleForm />
                  </SimpleProtectedRoute>
                } />
                
                <Route path="/sales/:id" element={
                  <SimpleProtectedRoute>
                    <SaleDetail />
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

                <Route path="/documents" element={
                  <SimpleProtectedRoute>
                    <Documents />
                  </SimpleProtectedRoute>
                } />

                <Route path="/templates" element={
                  <SimpleProtectedRoute>
                    <Templates />
                  </SimpleProtectedRoute>
                } />

                <Route path="/signature-workflow" element={
                  <SimpleProtectedRoute>
                    <SignatureWorkflow />
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

                <Route path="/audit" element={
                  <SimpleProtectedRoute>
                    <AuditDashboard />
                  </SimpleProtectedRoute>
                } />

                <Route path="/communications" element={
                  <SimpleProtectedRoute>
                    <Communications />
                  </SimpleProtectedRoute>
                } />

                <Route path="/files" element={
                  <SimpleProtectedRoute>
                    <FileManagement />
                  </SimpleProtectedRoute>
                } />

                <Route path="/experience" element={
                  <SimpleProtectedRoute>
                    <Experience />
                  </SimpleProtectedRoute>
                } />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SessionTimeoutProvider>
          </SimpleAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
