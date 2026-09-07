import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { normalizeRole, roleHomeMap, type Role, useAuth } from "../../context/AuthContext";

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: Role[];
  redirectTo?: string;
}

export default function RoleGate({
  children,
  allowedRoles,
  redirectTo,
}: RoleGateProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        Chargement du profil...
      </div>
    );
  }

  const currentRole = user ? normalizeRole(user.role) : null;

  if (!user || !currentRole || !allowedRoles.includes(currentRole)) {
    const fallback = redirectTo ?? roleHomeMap[currentRole ?? "ADMIN"] ?? "/auth";
    return <Navigate to={fallback} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
