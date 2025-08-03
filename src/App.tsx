
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/components/AuthProvider';
import { Toaster } from '@/components/ui/sonner';
import { RequireAuth } from '@/components/RequireAuth';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import Sales from '@/pages/Sales';
import SaleDetail from '@/pages/SaleDetail';
import SaleEdit from '@/pages/SaleEdit';
import NewSale from '@/pages/NewSale';
import Clients from '@/pages/Clients';
import Plans from '@/pages/Plans';
import Users from '@/pages/Users';
import Templates from '@/pages/Templates';
import TemplateDetail from '@/pages/TemplateDetail';
import TemplateEdit from '@/pages/TemplateEdit';
import Companies from '@/pages/Companies';
import Documents from '@/pages/Documents';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import Analytics from '@/pages/Analytics';
import AuditDashboard from '@/pages/AuditDashboard';
import Communications from '@/pages/Communications';
import FileManagement from '@/pages/FileManagement';
import Experience from '@/pages/Experience';
import SignatureView from '@/pages/SignatureView';
import SignatureWorkflow from '@/pages/SignatureWorkflow';
import QuestionnaireView from '@/pages/QuestionnaireView';
import NotFound from '@/pages/NotFound';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/signature/:token" element={<SignatureView />} />
              <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
              
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/sales" element={<RequireAuth><Sales /></RequireAuth>} />
              <Route path="/sales/:id" element={<RequireAuth><SaleDetail /></RequireAuth>} />
              <Route path="/sales/:id/edit" element={<RequireAuth><SaleEdit /></RequireAuth>} />
              <Route path="/new-sale" element={<RequireAuth><NewSale /></RequireAuth>} />
              <Route path="/clients" element={<RequireAuth><Clients /></RequireAuth>} />
              <Route path="/plans" element={<RequireAuth><Plans /></RequireAuth>} />
              <Route path="/users" element={<RequireAuth><Users /></RequireAuth>} />
              <Route path="/templates" element={<RequireAuth><Templates /></RequireAuth>} />
              <Route path="/templates/:id" element={<RequireAuth><TemplateDetail /></RequireAuth>} />
              <Route path="/templates/:id/edit" element={<RequireAuth><TemplateEdit /></RequireAuth>} />
              <Route path="/companies" element={<RequireAuth><Companies /></RequireAuth>} />
              <Route path="/documents" element={<RequireAuth><Documents /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
              <Route path="/audit" element={<RequireAuth><AuditDashboard /></RequireAuth>} />
              <Route path="/communications" element={<RequireAuth><Communications /></RequireAuth>} />
              <Route path="/files" element={<RequireAuth><FileManagement /></RequireAuth>} />
              <Route path="/experience" element={<RequireAuth><Experience /></RequireAuth>} />
              <Route path="/signature-workflow" element={<RequireAuth><SignatureWorkflow /></RequireAuth>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
