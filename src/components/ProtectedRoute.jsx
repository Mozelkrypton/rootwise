import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // or a spinner, session check is instant for the mock anyway
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
