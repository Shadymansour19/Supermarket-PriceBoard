import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { EyeIcon } from "../../components/EyeIcon";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import {
  createCashier,
  fetchCashiers,
  removeCashier,
  setCashierPassword,
  StaffError,
  type Cashier,
} from "../../lib/staff";

const MIN_PASSWORD_LENGTH = 8;

function PasswordInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required
        minLength={MIN_PASSWORD_LENGTH}
        autoComplete="new-password"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 pe-10 text-sm"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? t("common.hide") : t("common.show")}
        className="absolute end-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
      >
        <EyeIcon off={show} />
      </button>
    </div>
  );
}

export function AdminStaffPage() {
  const { t, i18n } = useTranslation();
  const confirmDialog = useConfirmDialog();
  const [cashiers, setCashiers] = useState<Cashier[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Which cashier's "set new password" row is open, and what's typed in it.
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const describe = useCallback(
    (err: unknown) => t(`staff.errors.${err instanceof StaffError ? err.code : "server_error"}`),
    [t],
  );

  const load = useCallback(() => {
    fetchCashiers()
      .then(setCashiers)
      .catch((err) => {
        setCashiers([]);
        setError(describe(err));
      });
  }, [describe]);

  useEffect(load, [load]);

  async function run(action: () => Promise<void>, successMessage: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(successMessage);
      load();
      return true;
    } catch (err) {
      setError(describe(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const ok = await run(
      () => createCashier({ email, password, display_name: name }),
      t("staff.created", { name }),
    );
    if (ok) {
      setName("");
      setEmail("");
      setPassword("");
    }
  }

  async function handleResetPassword(cashier: Cashier, e: FormEvent) {
    e.preventDefault();
    const ok = await run(() => setCashierPassword(cashier.id, resetPassword), t("staff.passwordChanged"));
    if (ok) {
      setResetId(null);
      setResetPassword("");
    }
  }

  async function handleRemove(cashier: Cashier) {
    if (!(await confirmDialog({ message: t("staff.confirmRemove", { name: cashier.display_name ?? cashier.email }), destructive: true }))) return;
    await run(() => removeCashier(cashier.id), t("staff.removed"));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("staff.title")}</h1>
        <p className="text-sm text-neutral-500">{t("staff.intro")}</p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}

      <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-heading text-sm font-semibold text-neutral-900">{t("staff.addCashier")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("staff.name")}
            aria-label={t("staff.name")}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("admin.email")}
            aria-label={t("admin.email")}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <PasswordInput value={password} onChange={setPassword} label={t("staff.password")} />
        </div>
        <p className="text-xs text-neutral-500">{t("staff.passwordHint", { count: MIN_PASSWORD_LENGTH })}</p>
        <button
          type="submit"
          disabled={busy}
          className="font-label rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {t("staff.create")}
        </button>
      </form>

      <section className="space-y-2">
        <h2 className="font-heading text-sm font-semibold text-neutral-900">{t("staff.cashiers")}</h2>
        {cashiers === null && <p className="text-sm text-neutral-500">{t("common.loading")}</p>}
        {cashiers?.length === 0 && !error && <p className="text-sm text-neutral-500">{t("staff.none")}</p>}
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {cashiers?.map((cashier) => (
            <li key={cashier.id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900">{cashier.display_name ?? "—"}</p>
                  <p className="font-label truncate text-xs text-neutral-500">
                    {cashier.email} · {new Date(cashier.created_at).toLocaleDateString(i18n.language)}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setResetId(resetId === cashier.id ? null : cashier.id);
                      setResetPassword("");
                    }}
                    className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    {t("staff.setPassword")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(cashier)}
                    disabled={busy}
                    className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
              {resetId === cashier.id && (
                <form onSubmit={(e) => handleResetPassword(cashier, e)} className="flex flex-wrap items-center gap-2">
                  <div className="min-w-48 flex-1">
                    <PasswordInput value={resetPassword} onChange={setResetPassword} label={t("staff.newPassword")} />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="font-label rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {t("common.save")}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
