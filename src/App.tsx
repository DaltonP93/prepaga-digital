
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SimpleAuthProvider } from "@/components/SimpleAuthProvider";
import { SimpleProtectedRoute } from "@/components/SimpleProtectedRoute";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const SimpleLogin = lazy(() => import("./pages/SimpleLogin"));
const SimpleDashboard = lazy(() => import("./pages/SimpleDashboard"));
const Sales = lazy(() => import("./pages/Sales"));
const NewSale = lazy(() => import("./pages/NewSale"));
const SaleEdit = lazy(() => import("./pages/SaleEdit"));
const SaleDetail = lazy(() => import("./pages/SaleDetail"));
const SaleForm = lazy(() => import("./pages/SaleForm"));
const Clients = lazy(() => import("./pages/Clients"));
const Plans = lazy(() => import("./pages/Plans"));
const Templates = lazy(() => import("./pages/Templates"));
const TemplateEdit = lazy(() => import("./pages/TemplateEdit"));
const Documents = lazy(() => import("./pages/Documents"));
const Users = lazy(() => import("./pages/Users"));
const Companies = lazy(() => import("./pages/Companies"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Experience = lazy(() => import("./pages/Experience"));
const NotFound = lazy(() => import("./pages/NotFound"));
const QuestionnaireView = lazy(() => import("./pages/QuestionnaireView"));
const SignatureView = lazy(() => import("./pages/SignatureView"));
const SignatureWorkflow = lazy(() => import("./pages/SignatureWorkflow"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SimpleAuthProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/login" element={<SimpleLogin />} />
              <Route path="/questionnaire/:token" element={<QuestionnaireView />} />
              <Route path="/signature/:token" element={<SignatureView />} />
              <Route
                path="/"
                element={
                  <SimpleProtectedRoute>
                    <SimpleDashboard />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <SimpleProtectedRoute>
                    <Sales />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/sales/new"
                element={
                  <SimpleProtectedRoute>
                    <NewSale />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/sales/:id"
                element={
                  <SimpleProtectedRoute>
                    <SaleDetail />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/sales/:id/edit"
                element={
                  <SimpleProtectedRoute>
                    <SaleEdit />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <SimpleProtectedRoute>
                    <Clients />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/plans"
                element={
                  <SimpleProtectedRoute>
                    <Plans />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/templates"
                element={
                  <SimpleProtectedRoute>
                    <Templates />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/templates/edit/:id"
                element={
                  <SimpleProtectedRoute>
                    <TemplateEdit />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/documents"
                element={
                  <SimpleProtectedRoute>
                    <Documents />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/signature-workflow"
                element={
                  <SimpleProtectedRoute>
                    <SignatureWorkflow />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <SimpleProtectedRoute>
                    <Analytics />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <SimpleProtectedRoute>
                    <Users />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/companies"
                element={
                  <SimpleProtectedRoute>
                    <Companies />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <SimpleProtectedRoute>
                    <Profile />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <SimpleProtectedRoute>
                    <Settings />
                  </SimpleProtectedRoute>
                }
              />
              <Route
                path="/experience"
                element={
                  <SimpleProtectedRoute>
                    <Experience />
                  </SimpleProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </SimpleAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
