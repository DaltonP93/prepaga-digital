
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SimpleAuthProvider } from "@/components/SimpleAuthProvider";
import { SimpleProtectedRoute } from "@/components/SimpleProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SimpleLogin from "./pages/SimpleLogin";
import SimpleDashboard from "./pages/SimpleDashboard";
import Sales from "./pages/Sales";
import SaleForm from "./pages/SaleForm";
import SaleEdit from "./pages/SaleEdit";
import NewSale from "./pages/NewSale";
import SaleDetail from "./pages/SaleDetail";
import Clients from "./pages/Clients";
import Plans from "./pages/Plans";
import Documents from "./pages/Documents";
import Templates from "./pages/Templates";
import TemplateEdit from "./pages/TemplateEdit";
import Users from "./pages/Users";
import Companies from "./pages/Companies";
import Profile from "./pages/Profile";
import Analytics from "./pages/Analytics";
import SignatureWorkflow from "./pages/SignatureWorkflow";
import Experience from "./pages/Experience";
import AuditDashboard from "./pages/AuditDashboard";
import SignatureView from "./pages/SignatureView";
import QuestionnaireView from "./pages/QuestionnaireView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SimpleAuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/simple-login" element={<SimpleLogin />} />
              <Route path="/signature/:token" element={<SignatureView />} />
              <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
              
              <Route path="/" element={
                <SimpleProtectedRoute>
                  <Index />
                </SimpleProtectedRoute>
              } />
              
              <Route path="/simple-dashboard" element={
                <SimpleProtectedRoute>
                  <SimpleDashboard />
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
              
              <Route path="/sales/form" element={
                <SimpleProtectedRoute>
                  <SaleForm />
                </SimpleProtectedRoute>
              } />
              
              <Route path="/sales/edit/:id" element={
                <SimpleProtectedRoute>
                  <SaleEdit />
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
              
              <Route path="/templates/edit/:id" element={
                <SimpleProtectedRoute>
                  <TemplateEdit />
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
              
              <Route path="/profile" element={
                <SimpleProtectedRoute>
                  <Profile />
                </SimpleProtectedRoute>
              } />
              
              <Route path="/analytics" element={
                <SimpleProtectedRoute>
                  <Analytics />
                </SimpleProtectedRoute>
              } />
              
              <Route path="/signature-workflow" element={
                <SimpleProtectedRoute>
                  <SignatureWorkflow />
                </SimpleProtectedRoute>
              } />
              
              <Route path="/experience" element={
                <SimpleProtectedRoute>
                  <Experience />
                </SimpleProtectedRoute>
              } />
              
              <Route path="/audit" element={
                <SimpleProtectedRoute>
                  <AuditDashboard />
                </SimpleProtectedRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SimpleAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
