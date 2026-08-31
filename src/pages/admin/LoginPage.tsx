import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { EyeIcon } from "../../components/EyeIcon";
import { useAuth } from "../../context/AuthContext";
import { signInAdmin } from "../../lib/auth";

export function LoginPage() {
  const { t } = useTranslation();
  const { session, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session && isAdmin) {
    return <Navigate to="/admin/products" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      await signInAdmin(email, password);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-xl border border-neutral-200 bg-white p-6">
      <h1 className="mb-4 text-lg font-semibold text-neutral-900">{t("admin.login")}</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-neutral-600">{t("admin.email")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-600">{t("admin.password")}</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 pe-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((show) => !show)}
              aria-label={showPassword ? t("common.hide") : t("common.show")}
              className="absolute end-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{t("admin.signInFailed")}</p>}
        {!loading && session && !isAdmin && (
          <p className="text-sm text-red-600">{t("admin.notAdmin")}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {t("admin.signIn")}
        </button>
      </form>
    </div>
  );
}
