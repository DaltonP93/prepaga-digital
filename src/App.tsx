
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { SimpleAuthProvider } from '@/components/SimpleAuthProvider';
import { SessionTimeoutProvider } from '@/components/SessionTimeoutProvider';
import MainLayout from '@/layouts/MainLayout';
import { SimpleProtectedRoute } from '@/components/SimpleProtectedRoute';

// Lazy load pages
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Sales from '@/pages/Sales';
import Clients from '@/pages/Clients';
import Plans from '@/pages/Plans';
import Documents from '@/pages/Documents';
import Templates from '@/pages/Templates';
import SignatureWorkflow from '@/pages/SignatureWorkflow';
import Analytics from '@/pages/Analytics';
import Profile from '@/pages/Profile';
import Users from '@/pages/Users';
import Companies from '@/pages/Companies';
import AuditDashboard from '@/pages/AuditDashboard';
import Experience from '@/pages/Experience';
import TemplateDetail from '@/pages/TemplateDetail';
import TemplateEdit from '@/pages/TemplateEdit';
import SaleDetail from '@/pages/SaleDetail';
import SaleEdit from '@/pages/SaleEdit';
import QuestionnaireView from '@/pages/QuestionnaireView';
import NotFound from '@/pages/NotFound';
import SignatureView from '@/pages/SignatureView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SimpleAuthProvider>
        <SessionTimeoutProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-background">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/sign/:token" element={<SignatureView />} />
                <Route path="/signature/:token" element={<SignatureWorkflow />} />
                <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
                
                {/* Protected routes with sidebar */}
                <Route path="/" element={
                  <SimpleProtectedRoute>
                    <MainLayout />
                  </SimpleProtectedRoute>
                }>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="sales" element={<Sales />} />
                  <Route path="sales/:id" element={<SaleDetail />} />
                  <Route path="sales/:id/edit" element={<SaleEdit />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="plans" element={<Plans />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="templates" element={<Templates />} />
                  <Route path="templates/:id" element={<TemplateDetail />} />
                  <Route path="templates/:id/edit" element={<TemplateEdit />} />
                  <Route path="signature-workflow" element={<SignatureWorkflow />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="users" element={<Users />} />
                  <Route path="companies" element={<Companies />} />
                  <Route path="audit" element={<AuditDashboard />} />
                  <Route path="experience" element={<Experience />} />
                </Route>
                
                {/* Catch all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <Toaster />
          </BrowserRouter>
        </SessionTimeoutProvider>
      </SimpleAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
