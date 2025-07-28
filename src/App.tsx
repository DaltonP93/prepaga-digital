
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { SimpleAuthProvider } from '@/components/SimpleAuthProvider';
import { SessionTimeoutProvider } from '@/components/SessionTimeoutProvider';
import { useCacheManager } from '@/hooks/useCacheManager';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import Sales from '@/pages/Sales';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Profile from '@/pages/Profile';
import RequireAuth from '@/components/RequireAuth';
import TwoFactorAuth from '@/pages/TwoFactorAuth';
import VerifyEmail from '@/pages/VerifyEmail';
import PublicLayout from '@/layouts/PublicLayout';
import MainLayout from '@/layouts/MainLayout';
import { CacheMonitor } from '@/components/CacheMonitor';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

function AppContent() {
  // Inicializar el manager de cache
  useCacheManager();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<PublicLayout />} >
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Route>

        <Route path="/" element={<MainLayout />} >
          <Route index element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/clients" element={<RequireAuth><Clients /></RequireAuth>} />
          <Route path="/sales" element={<RequireAuth><Sales /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/two-factor-auth" element={<RequireAuth><TwoFactorAuth /></RequireAuth>} />
          <Route path="/cache-monitor" element={<RequireAuth><CacheMonitor /></RequireAuth>} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SimpleAuthProvider>
          <SessionTimeoutProvider>
            <AppContent />
          </SessionTimeoutProvider>
        </SimpleAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
