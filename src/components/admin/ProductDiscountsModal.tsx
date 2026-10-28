import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import type { AdSpec } from "../../lib/adImage";
import { ProductAdModal } from "./ProductAdModal";
import {
  fetchLimitedTimeDiscount,
  fetchQuantityDiscount,
  isLimitedTimeDiscountActive,
  removeLimitedTimeDiscount,
  removeQuantityDiscount,
  setLimitedTimeDiscount,
  setQuantityDiscount,
} from "../../lib/discounts";
import { toErrorMessage } from "../../lib/errors";
import { formatPrice, localizedField } from "../../lib/localize";
import type { LimitedTimeDiscount, Product, QuantityDiscount } from "../../types/database";

type TierDraft = { min_quantity: string; price: string };

/** Admin editor for both discount types on one product — opened from the
 * products table. Loads any existing discounts, lets the admin toggle each
 * type on/off, and saves both independently on submit. */
export function ProductDiscountsModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const confirmDialog = useConfirmDialog();
  // Ads the admin accepted right after saving, shown one after another —
  // the modal only closes once the last one is dismissed.
  const [adQueue, setAdQueue] = useState<AdSpec[]>([]);
  // An ad opened on demand from a section's button; closing it leaves the
  // discounts form open.
  const [manualAd, setManualAd] = useState<AdSpec | null>(null);
  const [existingQd, setExistingQd] = useState<QuantityDiscount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [ltdEnabled, setLtdEnabled] = useState(false);
  const [ltdNewPrice, setLtdNewPrice] = useState("");
  const [ltdDurationDays, setLtdDurationDays] = useState("7");
  const [existingLtd, setExistingLtd] = useState<LimitedTimeDiscount | null>(null);

  const [qdEnabled, setQdEnabled] = useState(false);
  const [tiers, setTiers] = useState<TierDraft[]>([{ min_quantity: "", price: "" }]);

  useEffect(() => {
    Promise.all([fetchLimitedTimeDiscount(product.id), fetchQuantityDiscount(product.id)])
      .then(([ltd, qd]) => {
        setExistingLtd(ltd);
        if (ltd) {
          setLtdEnabled(true);
          setLtdNewPrice(String(ltd.new_price));
          setLtdDurationDays(String(ltd.duration_days));
        }
        setExistingQd(qd && qd.tiers.length > 0 ? qd : null);
        if (qd && qd.tiers.length > 0) {
          setQdEnabled(true);
          setTiers(qd.tiers.map((tier) => ({ min_quantity: String(tier.min_quantity), price: String(tier.price) })));
        }
      })
      .catch(() => setError(t("common.error")))
      .finally(() => setLoading(false));
    // Only ever loaded once, for the product the modal was opened for.
  }, [product.id]);

  function addTier() {
    setTiers((prev) => [...prev, { min_quantity: "", price: "" }]);
  }

  /** The saved tier a draft row still matches (unedited), if any — only
   * saved tiers can have an ad, since the ad reads the stored discount. */
  function savedTierFor(draft: TierDraft) {
    return existingQd?.tiers.find(
      (tier) => String(tier.min_quantity) === draft.min_quantity && String(tier.price) === draft.price,
    );
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTier(index: number, field: keyof TierDraft, value: string) {
    setTiers((prev) => prev.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let savedLtd: LimitedTimeDiscount | null = null;
      let savedQd: QuantityDiscount | null = null;
      if (ltdEnabled) {
        const newPrice = Number(ltdNewPrice);
        const durationDays = Number(ltdDurationDays);
        if (!(newPrice >= 0) || newPrice >= product.price) {
          throw new Error(t("admin.discountPriceTooHigh"));
        }
        if (!Number.isInteger(durationDays) || durationDays < 1) {
          throw new Error(t("admin.discountDurationInvalid"));
        }
        savedLtd = await setLimitedTimeDiscount(product.id, { new_price: newPrice, duration_days: durationDays });
      } else if (existingLtd) {
        await removeLimitedTimeDiscount(product.id);
      }

      if (qdEnabled) {
        const parsedTiers = tiers
          .filter((tier) => tier.min_quantity.trim() !== "" && tier.price.trim() !== "")
          .map((tier) => ({ min_quantity: Number(tier.min_quantity), price: Number(tier.price) }));
        if (parsedTiers.length === 0) {
          throw new Error(t("admin.discountTiersRequired"));
        }
        if (
          parsedTiers.some(
            (tier) =>
              !Number.isInteger(tier.min_quantity) ||
              tier.min_quantity < 2 ||
              !(tier.price >= 0) ||
              tier.price >= product.price,
          )
        ) {
          throw new Error(t("admin.discountTierInvalid"));
        }
        const seenQuantities = new Set<number>();
        for (const tier of parsedTiers) {
          if (seenQuantities.has(tier.min_quantity)) throw new Error(t("admin.discountTierDuplicate"));
          seenQuantities.add(tier.min_quantity);
        }
        savedQd = await setQuantityDiscount(product.id, parsedTiers);
      } else {
        await removeQuantityDiscount(product.id);
      }

      const accepted: AdSpec[] = [];
      if (savedLtd && (await confirmDialog({ message: t("admin.adPromptLimited") }))) {
        accepted.push({ kind: "limited", discount: savedLtd });
      }
      if (savedQd && (await confirmDialog({ message: t("admin.adPromptQuantity") }))) {
        accepted.push({ kind: "quantity", discount: savedQd });
      }
      if (accepted.length === 0) {
        onClose();
      } else {
        setAdQueue(accepted);
      }
    } catch (err) {
      setError(toErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="mb-1 text-sm font-semibold text-neutral-900">
            {t("admin.discountsFor", { name: localizedField(product, "name", i18n.language) })}
          </h2>
          <p className="mb-3 text-xs text-neutral-500">
            {t("admin.originalPrice")}: {formatPrice(product.price, i18n.language)}
          </p>

          {loading ? (
            <p className="text-neutral-500">{t("common.loading")}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}

              <fieldset className="space-y-3 rounded-lg border border-neutral-200 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                  <input type="checkbox" checked={ltdEnabled} onChange={(e) => setLtdEnabled(e.target.checked)} />
                  {t("admin.limitedTimeDiscount")}
                </label>
                {ltdEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-neutral-600">{t("admin.newPrice")}</label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={ltdNewPrice}
                        onChange={(e) => setLtdNewPrice(e.target.value)}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-neutral-600">{t("admin.durationDays")}</label>
                      <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={ltdDurationDays}
                        onChange={(e) => setLtdDurationDays(e.target.value)}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      />
                    </div>
                    {existingLtd && (
                      <p className="col-span-2 text-xs text-neutral-500">
                        {isLimitedTimeDiscountActive(existingLtd)
                          ? t("admin.discountEndsAt", {
                              date: new Date(existingLtd.ends_at).toLocaleDateString(i18n.language),
                            })
                          : t("admin.discountExpired")}
                      </p>
                    )}
                  </div>
                )}
                {ltdEnabled && existingLtd && isLimitedTimeDiscountActive(existingLtd) && (
                  <button
                    type="button"
                    onClick={() => setManualAd({ kind: "limited", discount: existingLtd })}
                    className="text-xs font-medium text-emerald-700 hover:underline"
                  >
                    {t("admin.createAd")}
                  </button>
                )}
              </fieldset>

              <fieldset className="space-y-3 rounded-lg border border-neutral-200 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                  <input type="checkbox" checked={qdEnabled} onChange={(e) => setQdEnabled(e.target.checked)} />
                  {t("admin.quantityDiscount")}
                </label>
                {qdEnabled && (
                  <div className="space-y-2">
                    {tiers.map((tier, index) => (
                      <div key={index} className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="mb-1 block text-xs text-neutral-600">{t("admin.minQuantity")}</label>
                          <input
                            type="number"
                            min="2"
                            step="1"
                            value={tier.min_quantity}
                            onChange={(e) => updateTier(index, "min_quantity", e.target.value)}
                            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-xs text-neutral-600">{t("admin.tierPrice")}</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={tier.price}
                            onChange={(e) => updateTier(index, "price", e.target.value)}
                            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                          />
                        </div>
                        {existingQd && savedTierFor(tier) && (
                          <button
                            type="button"
                            onClick={() =>
                              setManualAd({ kind: "quantity", discount: existingQd, tierId: savedTierFor(tier)!.id })
                            }
                            className="px-1 py-2 text-xs font-medium text-emerald-700 hover:underline"
                          >
                            {t("admin.createAd")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeTier(index)}
                          disabled={tiers.length <= 1}
                          className="px-1 py-2 text-xs text-red-600 hover:underline disabled:opacity-40"
                        >
                          {t("common.delete")}
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addTier} className="text-xs text-emerald-700 hover:underline">
                      {t("admin.addTier")}
                    </button>
                  </div>
                )}
                {qdEnabled && existingQd && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <button
                      type="button"
                      onClick={() => setManualAd({ kind: "quantity", discount: existingQd })}
                      className="text-xs font-medium text-emerald-700 hover:underline"
                    >
                      {existingQd.tiers.length > 1 ? t("admin.createAdAllTiers") : t("admin.createAd")}
                    </button>
                  </div>
                )}
              </fieldset>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? t("admin.saving") : t("common.save")}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      {adQueue.length > 0 && (
        <ProductAdModal
          product={product}
          spec={adQueue[0]}
          onClose={() => {
            if (adQueue.length === 1) onClose();
            else setAdQueue(adQueue.slice(1));
          }}
        />
      )}
      {manualAd && <ProductAdModal product={product} spec={manualAd} onClose={() => setManualAd(null)} />}
    </>
  );
}
