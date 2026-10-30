import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import { toErrorMessage } from "../../lib/errors";
import { fetchInvoices, InvoiceError, voidInvoice } from "../../lib/invoices";
import { formatPrice, formatQuantity } from "../../lib/localize";
import type { Invoice } from "../../types/database";

/** Recent invoices, newest first, tap to see the lines. A cashier only ever
 * receives their own (RLS); an admin receives everyone's and can void one —
 * undoing a mistake is a manager-level action, not a cashier one. */
export function InvoiceList({ limit = 50, refreshKey = 0 }: { limit?: number; refreshKey?: number }) {
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  const confirmDialog = useConfirmDialog();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchInvoices(limit)
      .then(setInvoices)
      .catch((err) => setError(toErrorMessage(err)));
  }, [limit]);

  // refreshKey lets a parent trigger a quiet re-read without remounting.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [load, refreshKey]);

  async function handleVoid(invoice: Invoice) {
    if (!(await confirmDialog({ message: t("cashier.confirmVoid"), destructive: true }))) return;
    setError(null);
    try {
      await voidInvoice(invoice.id);
      load();
    } catch (err) {
      setError(err instanceof InvoiceError ? t("cashier.errors.voidInsufficientStock") : toErrorMessage(err));
    }
  }

  if (invoices === null && !error) return <p className="text-sm text-neutral-500">{t("common.loading")}</p>;

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {invoices?.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">{t("cashier.noInvoices")}</p>}
      <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {invoices?.map((invoice) => {
          const open = openId === invoice.id;
          const voided = invoice.voided_at !== null;
          return (
            <li key={invoice.id} className="p-3">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : invoice.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 text-start"
              >
                <span className="min-w-0 space-y-0.5">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        invoice.kind === "sale" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {t(`cashier.kind.${invoice.kind}`)}
                    </span>
                    {voided && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        {t("cashier.voided")}
                      </span>
                    )}
                  </span>
                  <span className="font-label block truncate text-xs text-neutral-500">
                    {new Date(invoice.created_at).toLocaleString(i18n.language)}
                    {isAdmin && invoice.cashier_name && ` · ${invoice.cashier_name}`}
                  </span>
                </span>
                <span className={`font-label shrink-0 text-sm font-semibold ${voided ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
                  {formatPrice(invoice.total, i18n.language)}
                </span>
              </button>
              {open && (
                <div className="mt-2 space-y-1 border-t border-neutral-100 pt-2">
                  {invoice.note && <p className="text-xs text-neutral-500">{invoice.note}</p>}
                  <ul className="space-y-0.5">
                    {invoice.invoice_lines.map((line) => (
                      <li key={line.id} className="font-label flex justify-between gap-3 text-sm text-neutral-700">
                        <span className="min-w-0 truncate">{line.product_name}</span>
                        <span className="shrink-0 text-neutral-500">
                          {formatQuantity(line.quantity, i18n.language)} × {formatPrice(line.unit_price, i18n.language)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {isAdmin && !voided && (
                    <button
                      type="button"
                      onClick={() => handleVoid(invoice)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      {t("cashier.void")}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
