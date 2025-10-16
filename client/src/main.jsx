// client/src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./routes/AppLayout.jsx";
import PublicPage from "./routes/PublicPage.jsx";
import Login from "./routes/Login.jsx";
import Dashboard from "./routes/Dashboard.jsx";
import Products from "./routes/Products.jsx";
import ProductForm from "./routes/ProductForm.jsx";
import Scan from "./routes/Scan.jsx";
import OwnerAdmins from "./routes/OwnerAdmins.jsx";
import { AuthProvider, useAuth } from "./state/auth.jsx";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}
function OwnerOnly({ children }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== "owner") return <Navigate to="/dashboard" replace />;
  return children;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicPage />} />
          <Route path="/login" element={<Login />} />
          <Route element={<AppLayout />}>
            <Route
              path="/dashboard"
              element={<PrivateRoute><Dashboard /></PrivateRoute>}
            />
            <Route
              path="/products"
              element={<PrivateRoute><Products /></PrivateRoute>}
            />
            <Route
              path="/products/new"
              element={<PrivateRoute><ProductForm mode="create" /></PrivateRoute>}
            />
            <Route
              path="/products/:id"
              element={<PrivateRoute><ProductForm mode="edit" /></PrivateRoute>}
            />
            <Route
              path="/scan"
              element={<PrivateRoute><Scan /></PrivateRoute>}
            />
            <Route
              path="/owner/admins"
              element={<OwnerOnly><OwnerAdmins /></OwnerOnly>}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
