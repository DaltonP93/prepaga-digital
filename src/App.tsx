
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/components/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
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
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signature/:token" element={<SignatureView />} />
            <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
            
            {/* Protected routes - Dashboard as main route */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/clients" element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            } />
            <Route path="/sales" element={
              <ProtectedRoute>
                <Sales />
              </ProtectedRoute>
            } />
            <Route path="/documents" element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            } />
            <Route path="/templates" element={
              <ProtectedRoute>
                <Templates />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="/plans" element={
              <ProtectedRoute>
                <Plans />
              </ProtectedRoute>
            } />
            <Route path="/companies" element={
              <ProtectedRoute>
                <Companies />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/audit" element={
              <ProtectedRoute>
                <AuditDashboard />
              </ProtectedRoute>
            } />
            <Route path="/signature-workflow" element={
              <ProtectedRoute>
                <SignatureWorkflow />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/payment-success" element={
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            } />
            <Route path="/payment-canceled" element={
              <ProtectedRoute>
                <PaymentCanceled />
              </ProtectedRoute>
            } />
            <Route path="/communications" element={
              <ProtectedRoute>
                <Communications />
              </ProtectedRoute>
            } />
            <Route path="/file-management" element={
              <ProtectedRoute>
                <FileManagement />
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
