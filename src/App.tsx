import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Clients from "./pages/Clients";
import Sales from "./pages/Sales";
import Documents from "./pages/Documents";
import Templates from "./pages/Templates";
import SignatureView from "./pages/SignatureView";

// Add the Profile import
import Profile from "@/pages/Profile";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/clients",
    element: (
      <ProtectedRoute>
        <Clients />
      </ProtectedRoute>
    ),
  },
  {
    path: "/sales",
    element: (
      <ProtectedRoute>
        <Sales />
      </ProtectedRoute>
    ),
  },
  {
    path: "/documents",
    element: (
      <ProtectedRoute>
        <Documents />
      </ProtectedRoute>
    ),
  },
  {
    path: "/templates",
    element: (
      <ProtectedRoute>
        <Templates />
      </ProtectedRoute>
    ),
  },
  {
    path: "/signature/:token",
    element: <SignatureView />,
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
