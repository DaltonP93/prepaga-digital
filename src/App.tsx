
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SimpleAuthProvider } from '@/components/SimpleAuthProvider';
import { SimpleProtectedRoute } from '@/components/SimpleProtectedRoute';
import { Toaster } from '@/components/ui/sonner';
import SimpleLogin from '@/pages/SimpleLogin';
import Index from '@/pages/Index';
import Register from '@/pages/Register';
import ResetPassword from '@/pages/ResetPassword';
import Clients from '@/pages/Clients';
import Sales from '@/pages/Sales';
import Documents from '@/pages/Documents';
import Templates from '@/pages/Templates';
import SignatureView from '@/pages/SignatureView';
import Profile from '@/pages/Profile';
import Users from '@/pages/Users';
import Plans from '@/pages/Plans';
import Companies from '@/pages/Companies';
import QuestionnaireView from '@/pages/QuestionnaireView';
import AuditDashboard from '@/pages/AuditDashboard';
import SignatureWorkflow from '@/pages/SignatureWorkflow';
import Analytics from '@/pages/Analytics';
import PaymentSuccess from '@/pages/PaymentSuccess';
import PaymentCanceled from '@/pages/PaymentCanceled';
import Communications from '@/pages/Communications';
import FileManagement from '@/pages/FileManagement';
import Experience from '@/pages/Experience';

// Crear QueryClient simplificado
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  console.log('🚀 App: Iniciando aplicación con dashboard completo');
  
  return (
    <QueryClientProvider client={queryClient}>
      <SimpleAuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<SimpleLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signature/:token" element={<SignatureView />} />
            <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
            
            {/* Protected routes - usando Index como página principal */}
            <Route path="/" element={
              <SimpleProtectedRoute>
                <Index />
              </SimpleProtectedRoute>
            } />
            <Route path="/clients" element={
              <SimpleProtectedRoute>
                <Clients />
              </SimpleProtectedRoute>
            } />
            <Route path="/sales" element={
              <SimpleProtectedRoute>
                <Sales />
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
            <Route path="/users" element={
              <SimpleProtectedRoute>
                <Users />
              </SimpleProtectedRoute>
            } />
            <Route path="/plans" element={
              <SimpleProtectedRoute>
                <Plans />
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
            <Route path="/audit" element={
              <SimpleProtectedRoute>
                <AuditDashboard />
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
            <Route path="/payment-success" element={
              <SimpleProtectedRoute>
                <PaymentSuccess />
              </SimpleProtectedRoute>
            } />
            <Route path="/payment-canceled" element={
              <SimpleProtectedRoute>
                <PaymentCanceled />
              </SimpleProtectedRoute>
            } />
            <Route path="/communications" element={
              <SimpleProtectedRoute>
                <Communications />
              </SimpleProtectedRoute>
            } />
            <Route path="/file-management" element={
              <SimpleProtectedRoute>
                <FileManagement />
              </SimpleProtectedRoute>
            } />
            <Route path="/experience" element={
              <SimpleProtectedRoute>
                <Experience />
              </SimpleProtectedRoute>
            } />
          </Routes>
          <Toaster />
        </Router>
      </SimpleAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
