
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { SimpleAuthProvider } from '@/components/SimpleAuthProvider';
import { SimpleProtectedRoute } from '@/components/SimpleProtectedRoute';
import MainLayout from '@/layouts/MainLayout';
import PublicLayout from '@/layouts/PublicLayout';

// Import pages
import SimpleLogin from '@/pages/SimpleLogin';
import SimpleDashboard from '@/pages/SimpleDashboard';
import Sales from '@/pages/Sales';
import Clients from '@/pages/Clients';
import Plans from '@/pages/Plans';
import Templates from '@/pages/Templates';
import Users from '@/pages/Users';
import Companies from '@/pages/Companies';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import Analytics from '@/pages/Analytics';
import Documents from '@/pages/Documents';
import SignatureWorkflow from '@/pages/SignatureWorkflow';
import SignatureView from '@/pages/SignatureView';
import SaleDetail from '@/pages/SaleDetail';
import SaleEdit from '@/pages/SaleEdit';
import NewSale from '@/pages/NewSale';
import TemplateDetail from '@/pages/TemplateDetail';
import TemplateEdit from '@/pages/TemplateEdit';
import NotFound from '@/pages/NotFound';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SimpleAuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              <PublicLayout>
                <SimpleLogin />
              </PublicLayout>
            } />
            
            {/* Public signature route */}
            <Route path="/signature/:token" element={<SignatureView />} />
            
            {/* Protected routes with main layout */}
            <Route path="/" element={
              <SimpleProtectedRoute>
                <MainLayout />
              </SimpleProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<SimpleDashboard />} />
              <Route path="sales" element={<Sales />} />
              <Route path="sales/new" element={<NewSale />} />
              <Route path="sales/:id" element={<SaleDetail />} />
              <Route path="sales/:id/edit" element={<SaleEdit />} />
              <Route path="signature-workflow" element={<SignatureWorkflow />} />
              <Route path="signature-workflow/:saleId" element={<SignatureWorkflow />} />
              <Route path="clients" element={<Clients />} />
              <Route path="plans" element={<Plans />} />
              <Route path="templates" element={<Templates />} />
              <Route path="templates/:id" element={<TemplateDetail />} />
              <Route path="templates/:id/edit" element={<TemplateEdit />} />
              <Route path="users" element={<Users />} />
              <Route path="companies" element={<Companies />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="documents" element={<Documents />} />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </Router>
      </SimpleAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
