import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { session, isAdmin, loading } = useAuth();

  if (loading) {
    return <p className="p-6 text-neutral-500">{t("common.loading")}</p>;
  }
  if (!session || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
