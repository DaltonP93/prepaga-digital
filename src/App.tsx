
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Clients from "./pages/Clients";
import Plans from "./pages/Plans";
import Templates from "./pages/Templates";
import TemplateEdit from "./pages/TemplateEdit";
import TemplateDetail from "./pages/TemplateDetail";
import SaleDetail from "./pages/SaleDetail";
import NewSale from "./pages/NewSale";
import SaleEdit from "./pages/SaleEdit";
import Documents from "./pages/Documents";
import Analytics from "./pages/Analytics";
import Users from "./pages/Users";
import Companies from "./pages/Companies";
import AuditDashboard from "./pages/AuditDashboard";
import Experience from "./pages/Experience";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import SignatureView from "./pages/SignatureView";
import QuestionnaireView from "./pages/QuestionnaireView";
import { SimpleAuthProvider } from "./components/SimpleAuthProvider";
import { SimpleProtectedRoute } from "./components/SimpleProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <SimpleAuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signature/:token" element={<SignatureView />} />
            <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
            <Route path="/" element={<SimpleProtectedRoute><Index /></SimpleProtectedRoute>} />
            <Route path="/dashboard" element={<SimpleProtectedRoute><Dashboard /></SimpleProtectedRoute>} />
            <Route path="/sales" element={<SimpleProtectedRoute><Sales /></SimpleProtectedRoute>} />
            <Route path="/sales/new" element={<SimpleProtectedRoute><NewSale /></SimpleProtectedRoute>} />
            <Route path="/sales/:id" element={<SimpleProtectedRoute><SaleDetail /></SimpleProtectedRoute>} />
            <Route path="/sales/:id/edit" element={<SimpleProtectedRoute><SaleEdit /></SimpleProtectedRoute>} />
            <Route path="/clients" element={<SimpleProtectedRoute><Clients /></SimpleProtectedRoute>} />
            <Route path="/plans" element={<SimpleProtectedRoute><Plans /></SimpleProtectedRoute>} />
            <Route path="/templates" element={<SimpleProtectedRoute><Templates /></SimpleProtectedRoute>} />
            <Route path="/templates/:id" element={<SimpleProtectedRoute><TemplateDetail /></SimpleProtectedRoute>} />
            <Route path="/templates/edit/:id" element={<SimpleProtectedRoute><TemplateEdit /></SimpleProtectedRoute>} />
            <Route path="/documents" element={<SimpleProtectedRoute><Documents /></SimpleProtectedRoute>} />
            <Route path="/analytics" element={<SimpleProtectedRoute><Analytics /></SimpleProtectedRoute>} />
            <Route path="/users" element={<SimpleProtectedRoute><Users /></SimpleProtectedRoute>} />
            <Route path="/companies" element={<SimpleProtectedRoute><Companies /></SimpleProtectedRoute>} />
            <Route path="/audit" element={<SimpleProtectedRoute><AuditDashboard /></SimpleProtectedRoute>} />
            <Route path="/experience" element={<SimpleProtectedRoute><Experience /></SimpleProtectedRoute>} />
            <Route path="/profile" element={<SimpleProtectedRoute><Profile /></SimpleProtectedRoute>} />
            <Route path="/settings" element={<SimpleProtectedRoute><Settings /></SimpleProtectedRoute>} />
          </Routes>
        </SimpleAuthProvider>
      </BrowserRouter>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
