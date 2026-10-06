import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleRoute({
  children,
  roleRequired,
}: {
  children: ReactElement;
  roleRequired: string;
}) {
  const { role } = useAuth();

  if (role !== roleRequired) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}