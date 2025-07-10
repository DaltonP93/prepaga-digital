
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Users from "./pages/Users";
import Plans from "./pages/Plans";
import Templates from "./pages/Templates";
import Documents from "./pages/Documents";
import Sales from "./pages/Sales";
import SignatureView from "./pages/SignatureView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/signature/:token" element={<SignatureView />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/companies" element={
                        <ProtectedRoute requiredRole={['super_admin', 'admin']}>
                          <Companies />
                        </ProtectedRoute>
                      } />
                      <Route path="/users" element={
                        <ProtectedRoute requiredRole={['super_admin', 'admin']}>
                          <Users />
                        </ProtectedRoute>
                      } />
                      <Route path="/plans" element={<Plans />} />
                      <Route path="/templates" element={<Templates />} />
                      <Route path="/documents" element={<Documents />} />
                      <Route path="/sales" element={<Sales />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
