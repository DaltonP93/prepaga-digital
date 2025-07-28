
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
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Profile from '@/pages/Profile';
import RequireAuth from '@/components/RequireAuth';
import { CacheMonitor } from '@/components/CacheMonitor';
import { SimpleProtectedRoute } from '@/components/SimpleProtectedRoute';

// Importar páginas faltantes
import Plans from '@/pages/Plans';
import Documents from '@/pages/Documents';
import Templates from '@/pages/Templates';
import Analytics from '@/pages/Analytics';
import Users from '@/pages/Users';
import Companies from '@/pages/Companies';
import AuditDashboard from '@/pages/AuditDashboard';
import Experience from '@/pages/Experience';
import SignatureWorkflow from '@/pages/SignatureWorkflow';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 minutos
      gcTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

function AppContent() {
  useCacheManager();

  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Rutas protegidas */}
        <Route path="/" element={<SimpleProtectedRoute><Dashboard /></SimpleProtectedRoute>} />
        <Route path="/dashboard" element={<SimpleProtectedRoute><Dashboard /></SimpleProtectedRoute>} />
        <Route path="/clients" element={<SimpleProtectedRoute><Clients /></SimpleProtectedRoute>} />
        <Route path="/sales" element={<SimpleProtectedRoute><Sales /></SimpleProtectedRoute>} />
        <Route path="/plans" element={<SimpleProtectedRoute><Plans /></SimpleProtectedRoute>} />
        <Route path="/documents" element={<SimpleProtectedRoute><Documents /></SimpleProtectedRoute>} />
        <Route path="/templates" element={<SimpleProtectedRoute><Templates /></SimpleProtectedRoute>} />
        <Route path="/signature-workflow" element={<SimpleProtectedRoute><SignatureWorkflow /></SimpleProtectedRoute>} />
        <Route path="/analytics" element={<SimpleProtectedRoute><Analytics /></SimpleProtectedRoute>} />
        <Route path="/users" element={<SimpleProtectedRoute><Users /></SimpleProtectedRoute>} />
        <Route path="/companies" element={<SimpleProtectedRoute><Companies /></SimpleProtectedRoute>} />
        <Route path="/audit" element={<SimpleProtectedRoute><AuditDashboard /></SimpleProtectedRoute>} />
        <Route path="/experience" element={<SimpleProtectedRoute><Experience /></SimpleProtectedRoute>} />
        <Route path="/profile" element={<SimpleProtectedRoute><Profile /></SimpleProtectedRoute>} />
        <Route path="/cache-monitor" element={<SimpleProtectedRoute><CacheMonitor /></SimpleProtectedRoute>} />
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
