import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { EyeIcon } from "../EyeIcon";
import { addAccount, type SwitchResult } from "../../lib/accounts";

/** Sign in to another staff account without leaving the current one — a
 * wrong password keeps the current session. */
export function AddAccountDialog({
  onDone,
  onClose,
}: {
  onDone: (result: Extract<SwitchResult, { ok: true }>) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await addAccount(email, password);
    setSubmitting(false);
    if (result.ok) onDone(result);
    else setError(t(result.reason === "not_staff" ? "accounts.notStaff" : "admin.signInFailed"));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("accounts.add")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-3 rounded-xl bg-white p-4"
      >
        <h2 className="font-heading text-base font-bold text-neutral-900">{t("accounts.add")}</h2>
        <p className="text-sm text-neutral-600">{t("accounts.addHint")}</p>
        <input
          type="email"
          required
          autoFocus
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("admin.email")}
          aria-label={t("admin.email")}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("admin.password")}
            aria-label={t("admin.password")}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 pe-10 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? t("common.hide") : t("common.show")}
            className="absolute end-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
          >
            <EyeIcon off={showPassword} />
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="font-label rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="font-label rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {t("admin.signIn")}
          </button>
        </div>
      </form>
    </div>
  );
}
