
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SimpleAuthProvider } from "@/components/SimpleAuthProvider";
import { SimpleProtectedRoute } from "@/components/SimpleProtectedRoute";
import { SessionTimeoutProvider } from "@/components/SessionTimeoutProvider";

// Import pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import SimpleLogin from "./pages/SimpleLogin";
import SimpleDashboard from "./pages/SimpleDashboard";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Clients from "./pages/Clients";
import Plans from "./pages/Plans";
import Templates from "./pages/Templates";
import Sales from "./pages/Sales";
import NewSale from "./pages/NewSale"; // New import
import SaleForm from "./pages/SaleForm";
import SaleEdit from "./pages/SaleEdit";
import SaleDetail from "./pages/SaleDetail";
import Companies from "./pages/Companies";
import Communications from "./pages/Communications";
import Analytics from "./pages/Analytics";
import Documents from "./pages/Documents";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import FileManagement from "./pages/FileManagement";
import SignatureView from "./pages/SignatureView";
import QuestionnaireView from "./pages/QuestionnaireView";
import SignatureWorkflow from "./pages/SignatureWorkflow";
import AuditDashboard from "./pages/AuditDashboard";
import Experience from "./pages/Experience";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SimpleAuthProvider>
      <SessionTimeoutProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/simple-login" element={<SimpleLogin />} />
              <Route path="/signature/:token" element={<SignatureView />} />
              <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
              
              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <SimpleProtectedRoute>
                    <SimpleDashboard />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/admin-dashboard"
                element={
                  <SimpleProtectedRoute>
                    <Dashboard />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <SimpleProtectedRoute>
                    <Users />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <SimpleProtectedRoute>
                    <Clients />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/plans"
                element={
                  <SimpleProtectedRoute>
                    <Plans />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/templates"
                element={
                  <SimpleProtectedRoute>
                    <Templates />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <SimpleProtectedRoute>
                    <Sales />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/sales/new"
                element={
                  <SimpleProtectedRoute>
                    <NewSale />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/sales/:id"
                element={
                  <SimpleProtectedRoute>
                    <SaleDetail />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/sales/:id/edit"
                element={
                  <SimpleProtectedRoute>
                    <SaleEdit />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/companies"
                element={
                  <SimpleProtectedRoute>
                    <Companies />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/communications"
                element={
                  <SimpleProtectedRoute>
                    <Communications />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <SimpleProtectedRoute>
                    <Analytics />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/documents"
                element={
                  <SimpleProtectedRoute>
                    <Documents />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <SimpleProtectedRoute>
                    <Profile />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <SimpleProtectedRoute>
                    <Settings />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/files"
                element={
                  <SimpleProtectedRoute>
                    <FileManagement />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/signature-workflow"
                element={
                  <SimpleProtectedRoute>
                    <SignatureWorkflow />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/audit"
                element={
                  <SimpleProtectedRoute>
                    <AuditDashboard />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/experience"
                element={
                  <SimpleProtectedRoute>
                    <Experience />
                  </SimpleProtectedRoute>
                }
              />
              
              {/* Redirect old routes */}
              <Route path="/sale-form" element={<Navigate to="/sales/new" replace />} />
              <Route path="/sale-form/:id" element={<Navigate to="/sales/:id/edit" replace />} />
              
              {/* 404 page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SessionTimeoutProvider>
    </SimpleAuthProvider>
  </QueryClientProvider>
);

export default App;
