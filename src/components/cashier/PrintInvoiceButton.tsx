import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toErrorMessage } from "../../lib/errors";
import { fetchInvoice } from "../../lib/invoices";
import {
  printInvoice,
  readReceiptPaper,
  saveReceiptPaper,
  type ReceiptLabels,
  type ReceiptPaper,
} from "../../lib/receipt";
import type { Invoice } from "../../types/database";

/** "Print" plus the paper choice (thermal 80/58 mm roll or A4), remembered
 * per device. Pass either the loaded `invoice` or just its `invoiceId`
 * (fetched on click, e.g. right after recording a sale). */
export function PrintInvoiceButton({ invoice, invoiceId }: { invoice?: Invoice; invoiceId?: string }) {
  const { t, i18n } = useTranslation();
  const [paper, setPaper] = useState<ReceiptPaper>(readReceiptPaper);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePrint() {
    setBusy(true);
    setError(null);
    try {
      const full = invoice ?? (await fetchInvoice(invoiceId!));
      const labels: ReceiptLabels = {
        storeName: t("app.name"),
        title: t(full.kind === "sale" ? "receipt.sale" : "receipt.purchase"),
        invoiceNo: t("receipt.invoiceNo"),
        date: t("receipt.date"),
        cashier: t("receipt.cashier"),
        item: t("receipt.item"),
        total: t("cart.total"),
        voided: t("cashier.voided"),
        thanks: t("receipt.thanks"),
      };
      await printInvoice(full, labels, i18n.language, paper);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <select
        value={paper}
        onChange={(e) => {
          const next = e.target.value as ReceiptPaper;
          setPaper(next);
          saveReceiptPaper(next);
        }}
        aria-label={t("receipt.paper")}
        className="rounded-md border border-neutral-300 bg-white px-1.5 py-1 text-xs"
      >
        <option value="80">{t("receipt.paper80")}</option>
        <option value="58">{t("receipt.paper58")}</option>
        <option value="a4">A4</option>
      </select>
      <button
        type="button"
        onClick={handlePrint}
        disabled={busy}
        className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
      >
        {t("receipt.print")}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
