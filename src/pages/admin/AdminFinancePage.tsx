import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { InvoiceList } from "../../components/cashier/InvoiceList";
import { PaymentsChart } from "../../components/admin/PaymentsChart";
import { toErrorMessage } from "../../lib/errors";
import { fetchPayments, fetchStockValuation, type Granularity } from "../../lib/finance";
import { formatPrice } from "../../lib/localize";
import type { PaymentsBucket, StockValuation } from "../../types/database";

const GRANULARITIES: Granularity[] = ["day", "week", "month"];
/** "Live" = re-read this often (and whenever the tab regains focus). */
const REFRESH_MS = 20_000;

function Tile({ label, value, tone = "text-neutral-900", hint }: { label: string; value: string; tone?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="font-label text-xs text-neutral-500">{label}</p>
      <p className={`font-label mt-1 text-xl font-bold ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

export function AdminFinancePage() {
  const { t, i18n } = useTranslation();
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [payments, setPayments] = useState<PaymentsBucket[] | null>(null);
  const [valuation, setValuation] = useState<StockValuation | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped after a refresh so the invoice list below re-reads too.
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    Promise.all([fetchPayments(granularity), fetchStockValuation()])
      .then(([p, v]) => {
        setPayments(p);
        setValuation(v);
        setError(null);
        setTick((n) => n + 1);
      })
      .catch((err) => setError(toErrorMessage(err)));
  }, [granularity]);

  useEffect(() => {
    setPayments(null);
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const current = payments?.[payments.length - 1];
  const fmt = (value: number) => formatPrice(value, i18n.language);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("finance.title")}</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold text-neutral-900">{t("finance.stockValue")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Tile
            label={t("finance.stockAtCost")}
            value={valuation ? fmt(valuation.cost_value) : "…"}
            tone="text-emerald-700"
            hint={
              valuation && valuation.products_missing_cost > 0
                ? t("finance.missingCost", { count: valuation.products_missing_cost })
                : undefined
            }
          />
          <Tile
            label={t("finance.stockAtPrice")}
            value={valuation ? fmt(valuation.retail_value) : "…"}
            hint={valuation ? t("finance.productsInStock", { count: valuation.products_in_stock }) : undefined}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-semibold text-neutral-900">{t("finance.payments")}</h2>
          <div role="tablist" className="font-label inline-flex rounded-lg border border-neutral-300 bg-white p-0.5 text-sm">
            {GRANULARITIES.map((g) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={granularity === g}
                onClick={() => setGranularity(g)}
                className={`rounded-md px-3 py-1 ${
                  granularity === g ? "bg-emerald-600 text-white" : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {t(`finance.${g}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Tile
            label={`${t("finance.moneyIn")} · ${t(`finance.current.${granularity}`)}`}
            value={current ? fmt(current.payments_in) : "…"}
            tone="text-emerald-700"
          />
          <Tile
            label={`${t("finance.moneyOut")} · ${t(`finance.current.${granularity}`)}`}
            value={current ? fmt(current.payments_out) : "…"}
          />
          <Tile
            label={t("finance.net")}
            value={current ? fmt(current.payments_in - current.payments_out) : "…"}
            tone={current && current.payments_in - current.payments_out < 0 ? "text-red-600" : "text-neutral-900"}
          />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          {payments ? (
            <PaymentsChart data={payments} granularity={granularity} />
          ) : (
            <p className="text-sm text-neutral-500">{t("common.loading")}</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold text-neutral-900">{t("finance.recentInvoices")}</h2>
        <InvoiceList refreshKey={tick} limit={30} />
      </section>
    </div>
  );
}
