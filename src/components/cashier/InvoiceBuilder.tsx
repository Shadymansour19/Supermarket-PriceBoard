import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CloseIcon } from "../ContactIcons";
import { QuantityStepper } from "../QuantityStepper";
import { PrintInvoiceButton } from "./PrintInvoiceButton";
import { fetchActiveLimitedTimeDiscountMap, fetchActiveQuantityDeals } from "../../lib/discounts";
import { toErrorMessage } from "../../lib/errors";
import { InvoiceError, recordInvoice } from "../../lib/invoices";
import { formatPrice, formatQuantity, localizedField, shouldShowUnit } from "../../lib/localize";
import { unitPriceFor } from "../../lib/pricing";
import { fetchProducts } from "../../lib/products";
import { maxQuantity, minQuantity } from "../../lib/stock";
import type { InvoiceKind, LimitedTimeDiscount, Product, QuantityDiscount } from "../../types/database";

type Line = {
  product: Product;
  quantity: number;
  /** Purchase only: the supplier's unit cost, kept as typed. */
  cost: string;
};

/**
 * The cashier's invoice form, used for both kinds: a **sale** (a customer's
 * purchase — stock goes down, the server prices each line) and a
 * **purchase** (goods received from a supplier — stock goes up, the cashier
 * types the unit cost from the supplier's invoice). The prices shown for a
 * sale are a preview; the database sets the real ones when it records the
 * invoice, and the confirmation shows its total.
 */
export function InvoiceBuilder({ kind }: { kind: InvoiceKind }) {
  const { t, i18n } = useTranslation();
  const isSale = kind === "sale";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<{ id: string; total: number } | null>(null);
  const [limitedTimeMap, setLimitedTimeMap] = useState<Map<string, LimitedTimeDiscount>>(new Map());
  const [quantityDealMap, setQuantityDealMap] = useState<Map<string, QuantityDiscount>>(new Map());

  useEffect(() => {
    if (!isSale) return;
    Promise.all([fetchActiveLimitedTimeDiscountMap(), fetchActiveQuantityDeals()])
      .then(([limitedTime, quantityDeals]) => {
        setLimitedTimeMap(limitedTime);
        setQuantityDealMap(new Map(quantityDeals.map(({ product, discount }) => [product.id, discount])));
      })
      .catch(() => {});
  }, [isSale]);

  // Debounced server-side search — the catalog can be large, and an empty
  // box deliberately lists nothing instead of dumping every product.
  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(() => {
      fetchProducts({ search: term })
        .then((products) => {
          if (!cancelled) setResults(products.slice(0, 8));
        })
        .catch(() => {});
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);

  function addProduct(product: Product) {
    setRecorded(null);
    setError(null);
    setLines((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (!existing) return [...prev, { product, quantity: minQuantity(product), cost: "" }];
      return prev.map((line) => {
        if (line.product.id !== product.id) return line;
        const max = isSale ? maxQuantity(product) : undefined;
        const next = line.quantity + 1;
        return { ...line, quantity: max === undefined ? next : Math.min(next, max) };
      });
    });
    setQuery("");
    setResults([]);
  }

  function updateLine(productId: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((line) => (line.product.id === productId ? { ...line, ...patch } : line)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((line) => line.product.id !== productId));
  }

  function lineUnitPrice(line: Line): number {
    return isSale
      ? unitPriceFor(line.product, line.quantity, limitedTimeMap.get(line.product.id), quantityDealMap.get(line.product.id))
      : Number(line.cost) || 0;
  }

  const total = lines.reduce((sum, line) => sum + Math.round(line.quantity * lineUnitPrice(line) * 100) / 100, 0);
  const missingCost = !isSale && lines.some((line) => line.cost.trim() === "" || Number(line.cost) < 0);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await recordInvoice(
        kind,
        lines.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
          ...(isSale ? {} : { unit_price: Number(line.cost) }),
        })),
        note,
      );
      setRecorded(result);
      setLines([]);
      setNote("");
    } catch (err) {
      if (err instanceof InvoiceError) {
        const product = lines.find((line) => line.product.id === err.productId)?.product;
        setError(
          t(`cashier.errors.${err.code}`, { name: product ? localizedField(product, "name", i18n.language) : "" }),
        );
      } else {
        setError(toErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("cashier.searchProducts")}
          aria-label={t("cashier.searchProducts")}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm"
        />
        {results.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
            {results.map((product) => {
              const blocked = isSale && product.stock_quantity <= 0;
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => addProduct(product)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <span className="min-w-0 truncate text-neutral-900">
                      {localizedField(product, "name", i18n.language)}
                      {product.size && <span className="text-neutral-400"> ({product.size})</span>}
                    </span>
                    <span className="font-label shrink-0 text-xs text-neutral-500">
                      {blocked
                        ? t("product.outOfStock")
                        : t("cashier.onHand", { quantity: formatQuantity(product.stock_quantity, i18n.language) })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {recorded !== null && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
        >
          <span>
            {t(isSale ? "cashier.saleRecorded" : "cashier.purchaseRecorded", {
              total: formatPrice(recorded.total, i18n.language),
            })}
          </span>
          <PrintInvoiceButton invoiceId={recorded.id} />
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {lines.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">{t(isSale ? "cashier.emptySale" : "cashier.emptyPurchase")}</p>
      ) : (
        <>
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {lines.map((line) => {
              const { product } = line;
              const unitPrice = lineUnitPrice(line);
              return (
                <li key={product.id} className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 font-medium text-neutral-900">
                      {localizedField(product, "name", i18n.language)}
                      {shouldShowUnit(product.unit) && (
                        <span className="text-sm font-normal text-neutral-400"> / {t(`unit.${product.unit}`)}</span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeLine(product.id)}
                      aria-label={t("cart.remove")}
                      className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <QuantityStepper
                      value={line.quantity}
                      onChange={(quantity) => updateLine(product.id, { quantity })}
                      allowFraction={product.allow_fraction}
                      max={isSale ? maxQuantity(product) : undefined}
                    />
                    {isSale ? (
                      <span className="font-label text-sm text-neutral-600">{formatPrice(unitPrice, i18n.language)}</span>
                    ) : (
                      <label className="font-label flex items-center gap-1.5 text-sm text-neutral-600">
                        {t("cashier.unitCost")}
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={line.cost}
                          onChange={(e) => updateLine(product.id, { cost: e.target.value })}
                          className="w-24 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                        />
                      </label>
                    )}
                    <span className="font-label ms-auto text-sm font-semibold text-emerald-700">
                      {formatPrice(Math.round(line.quantity * unitPrice * 100) / 100, i18n.language)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t(isSale ? "cashier.saleNote" : "cashier.purchaseNote")}
            aria-label={t(isSale ? "cashier.saleNote" : "cashier.purchaseNote")}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
          />

          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
            <span className="font-heading text-base font-semibold text-neutral-900">{t("cart.total")}</span>
            <span className="font-label text-xl font-bold text-emerald-700">{formatPrice(total, i18n.language)}</span>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || missingCost}
            className="font-label w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {t(isSale ? "cashier.completeSale" : "cashier.completePurchase")}
          </button>
        </>
      )}
    </div>
  );
}
