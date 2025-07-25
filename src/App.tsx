
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import your page components
import SimpleDashboard from '@/pages/SimpleDashboard';
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';
import Clients from '@/pages/Clients';
import Plans from '@/pages/Plans';
import Sales from '@/pages/Sales';
import SaleForm from '@/pages/SaleForm';
import Templates from '@/pages/Templates';
import Documents from '@/pages/Documents';
import Analytics from '@/pages/Analytics';
import Companies from '@/pages/Companies';
import Users from '@/pages/Users';
import Communications from '@/pages/Communications';
import FileManagement from '@/pages/FileManagement';
import Experience from '@/pages/Experience';
import AuditDashboard from '@/pages/AuditDashboard';
import NotFound from '@/pages/NotFound';
import SimpleLogin from '@/pages/SimpleLogin';
import Register from '@/pages/Register';
import ResetPassword from '@/pages/ResetPassword';
import QuestionnaireView from '@/pages/QuestionnaireView';
import SignatureView from '@/pages/SignatureView';
import SignatureWorkflow from '@/pages/SignatureWorkflow';
import PaymentSuccess from '@/pages/PaymentSuccess';
import PaymentCanceled from '@/pages/PaymentCanceled';
import SaleDetail from "@/pages/SaleDetail";

// Import your authentication provider and protected route component
import { SimpleAuthProvider } from '@/components/SimpleAuthProvider';
import { SimpleProtectedRoute } from '@/components/SimpleProtectedRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <QueryClientProvider client={queryClient}>
        <SimpleAuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<SimpleLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
            <Route path="/signature/:token" element={<SignatureView />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />

            {/* Protected routes */}
            <Route path="/" element={<SimpleProtectedRoute><Dashboard /></SimpleProtectedRoute>} />
            <Route path="/dashboard" element={<SimpleProtectedRoute><Dashboard /></SimpleProtectedRoute>} />
            <Route path="/profile" element={<SimpleProtectedRoute><Profile /></SimpleProtectedRoute>} />
            <Route path="/clients" element={<SimpleProtectedRoute><Clients /></SimpleProtectedRoute>} />
            <Route path="/plans" element={<SimpleProtectedRoute><Plans /></SimpleProtectedRoute>} />
            <Route path="/sales" element={<SimpleProtectedRoute><Sales /></SimpleProtectedRoute>} />
            <Route path="/sales/new" element={<SimpleProtectedRoute><SaleForm /></SimpleProtectedRoute>} />
            <Route path="/sales/:id" element={<SimpleProtectedRoute><SaleDetail /></SimpleProtectedRoute>} />
            <Route path="/signature-workflow" element={<SimpleProtectedRoute><SignatureWorkflow /></SimpleProtectedRoute>} />
            <Route path="/templates" element={<SimpleProtectedRoute><Templates /></SimpleProtectedRoute>} />
            <Route path="/documents" element={<SimpleProtectedRoute><Documents /></SimpleProtectedRoute>} />
            <Route path="/analytics" element={<SimpleProtectedRoute><Analytics /></SimpleProtectedRoute>} />
            <Route path="/companies" element={<SimpleProtectedRoute><Companies /></SimpleProtectedRoute>} />
            <Route path="/users" element={<SimpleProtectedRoute><Users /></SimpleProtectedRoute>} />
            <Route path="/communications" element={<SimpleProtectedRoute><Communications /></SimpleProtectedRoute>} />
            <Route path="/file-management" element={<SimpleProtectedRoute><FileManagement /></SimpleProtectedRoute>} />
            <Route path="/experience" element={<SimpleProtectedRoute><Experience /></SimpleProtectedRoute>} />
            <Route path="/audit" element={<SimpleProtectedRoute><AuditDashboard /></SimpleProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SimpleAuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
