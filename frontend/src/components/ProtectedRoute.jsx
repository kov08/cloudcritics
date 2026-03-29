import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();

  // boolean replace = true prevents browser's back button to navigate to protected route after logout
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Otherwise, render the secure component
  return children;
};
