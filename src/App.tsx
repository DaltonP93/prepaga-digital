
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SimpleAuthProvider } from "@/components/SimpleAuthProvider";
import { CompanyBrandingProvider } from "@/components/CompanyBrandingProvider";
import { SimpleProtectedRoute } from "@/components/SimpleProtectedRoute";
import SimpleLoginForm from "@/components/SimpleLoginForm";
import SimpleDashboard from "@/pages/SimpleDashboard";

// Crear cliente de React Query con configuración optimizada
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SimpleAuthProvider>
          <CompanyBrandingProvider>
            <Toaster />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<SimpleLoginForm />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <SimpleProtectedRoute>
                      <SimpleDashboard />
                    </SimpleProtectedRoute>
                  } 
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </CompanyBrandingProvider>
        </SimpleAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
