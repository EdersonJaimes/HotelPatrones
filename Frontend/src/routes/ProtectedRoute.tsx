import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { token, role } = useAuth();

  // No logueado
  if (!token) return <Navigate to="/login" />;

  // Si hay roles definidos y no coincide
  if (allowedRoles && !allowedRoles.includes(role!)) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
}