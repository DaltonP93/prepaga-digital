import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import Sales from "@/pages/Sales";
import Clients from "@/pages/Clients";
import Plans from "@/pages/Plans";
import Templates from "@/pages/Templates";
import TemplateEditor from "@/pages/TemplateEditor";
import SignatureWorkflow from "@/pages/SignatureWorkflow";
import Signature from "@/pages/Signature";
import Questionnaire from "@/pages/Questionnaire";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import EmailVerification from "@/pages/EmailVerification";
import Beneficiaries from "@/pages/Beneficiaries";
import Documents from "@/pages/Documents";
import Communication from "@/pages/Communication";
import APIConfig from "@/pages/APIConfig";

function App() {
  return (
    <QueryClient>
      <AuthProvider>
        <Toaster />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/email-verification" element={<EmailVerification />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute>
                  <Sales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <Clients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plans"
              element={
                <ProtectedRoute>
                  <Plans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates"
              element={
                <ProtectedRoute>
                  <Templates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/:id"
              element={
                <ProtectedRoute>
                  <TemplateEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/signature-workflow"
              element={
                <ProtectedRoute>
                  <SignatureWorkflow />
                </ProtectedRoute>
              }
            />
            <Route path="/signature/:token" element={<Signature />} />
            <Route path="/questionnaire/:token" element={<Questionnaire />} />
            <Route
              path="/beneficiaries"
              element={
                <ProtectedRoute>
                  <Beneficiaries />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <Documents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/communication"
              element={
                <ProtectedRoute>
                  <Communication />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/api-config" 
              element={
                <ProtectedRoute>
                  <APIConfig />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClient>
  );
}

export default App;
