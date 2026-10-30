import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { StaffRole } from "../../types/database";

/** Gates a staff area to the given roles (admin only unless told
 * otherwise). Anyone else — signed out, a customer, or the wrong staff
 * role — goes to the login page, which sends an already-signed-in staff
 * member on to the area their own role belongs in. */
export function ProtectedRoute({ children, roles = ["admin"] }: { children: ReactNode; roles?: StaffRole[] }) {
  const { t } = useTranslation();
  const { session, role, loading } = useAuth();

  if (loading) {
    return <p className="p-6 text-neutral-500">{t("common.loading")}</p>;
  }
  if (!session || !role || !roles.includes(role)) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
