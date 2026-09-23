import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProductDiscountsModal } from "../../components/admin/ProductDiscountsModal";
import { ProductForm, type ProductFormValues } from "../../components/admin/ProductForm";
import { fetchCategoryTree } from "../../lib/categories";
import { deleteProductImage, uploadProductImage } from "../../lib/imageUpload";
import { formatPrice, shouldShowUnit } from "../../lib/localize";
import { createProduct, deleteProduct, fetchProducts, updateProduct } from "../../lib/products";
import { productImageUrl } from "../../lib/supabase";
import type { CategoryWithChildren, Product } from "../../types/database";

type FormMode = { kind: "create" } | { kind: "edit"; product: Product };

/** A yes/no fact about a row (in stock, visible to customers) — a colored
 * pill instead of a bare ✅/— glyph reads faster and matches the badge
 * style already used on the public site. */
function StatusBadge({ ok, yesLabel, noLabel }: { ok: boolean; yesLabel: string; noLabel: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
      }`}
    >
      {ok ? yesLabel : noLabel}
    </span>
  );
}

function ProductActions({
  onEdit,
  onDiscounts,
  onDelete,
}: {
  onEdit: () => void;
  onDiscounts: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
      >
        {t("common.edit")}
      </button>
      <button
        type="button"
        onClick={onDiscounts}
        className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
      >
        {t("admin.discounts")}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        {t("common.delete")}
      </button>
    </div>
  );
}

export function AdminProductsPage() {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [discountsProduct, setDiscountsProduct] = useState<Product | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    return Promise.all([fetchProducts({ includeInactive: true }), fetchCategoryTree()])
      .then(([p, c]) => {
        setProducts(p);
        setCategoryTree(c);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleSubmit(values: ProductFormValues, imageFile: File | null, removeImage: boolean) {
    setActionError(null);
    const payload = {
      name_en: values.name_en,
      name_ar: values.name_ar,
      description_en: values.description_en || null,
      description_ar: values.description_ar || null,
      price: Number(values.price),
      unit: values.unit,
      size: values.size || null,
      category_id: values.category_id,
      in_stock: values.in_stock,
      is_active: values.is_active,
    };
    const previousImagePath = formMode?.kind === "edit" ? formMode.product.image_path : null;

    try {
      let product: Product;
      if (formMode?.kind === "edit") {
        product = await updateProduct(formMode.product.id, payload);
      } else {
        product = await createProduct(payload);
      }

      if (imageFile) {
        const path = await uploadProductImage(imageFile, product.id);
        await updateProduct(product.id, { image_path: path });
        // Best-effort cleanup of the photo it replaced — not critical if
        // this fails, so it shouldn't block the save that already succeeded.
        if (previousImagePath) await deleteProductImage(previousImagePath).catch(() => {});
      } else if (removeImage && previousImagePath) {
        await updateProduct(product.id, { image_path: null });
        await deleteProductImage(previousImagePath).catch(() => {});
      }

      setFormMode(null);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(t("common.confirmDelete"))) return;
    setActionError(null);
    try {
      await deleteProduct(product.id);
      if (product.image_path) await deleteProductImage(product.image_path).catch(() => {});
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("admin.products")}</h1>
        {!formMode && (
          <button
            type="button"
            onClick={() => setFormMode({ kind: "create" })}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t("admin.newProduct")}
          </button>
        )}
      </div>

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      {formMode && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="font-heading mb-3 text-sm font-semibold text-neutral-900">
            {formMode.kind === "edit" ? t("admin.editProduct") : t("admin.newProduct")}
          </h2>
          <ProductForm
            categoryTree={categoryTree}
            initial={formMode.kind === "edit" ? formMode.product : undefined}
            onSubmit={handleSubmit}
            onCancel={() => setFormMode(null)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500">{t("common.loading")}</p>
      ) : products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-500">
          {t("admin.noProducts")}
        </p>
      ) : (
        <>
          {/* Mobile: a dense multi-column table doesn't fit a phone screen
           * at all, so this is a card list instead — the table below is
           * desktop/tablet-only. */}
          <div className="space-y-3 md:hidden">
            {products.map((product) => {
              const imageUrl = productImageUrl(product.image_path);
              return (
                <div key={product.id} className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {imageUrl && <img src={imageUrl} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="truncate font-medium text-neutral-900">
                      {product.name_en} / {product.name_ar}
                      {product.size && <span className="text-neutral-400"> ({product.size})</span>}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {formatPrice(product.price, i18n.language)}
                      {shouldShowUnit(product.unit) && (
                        <span className="text-neutral-400"> / {t(`unit.${product.unit}`)}</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge ok={product.in_stock} yesLabel={t("admin.inStock")} noLabel={t("product.outOfStock")} />
                      <StatusBadge ok={product.is_active} yesLabel={t("admin.active")} noLabel={t("admin.hidden")} />
                    </div>
                    <ProductActions
                      onEdit={() => setFormMode({ kind: "edit", product })}
                      onDiscounts={() => setDiscountsProduct(product)}
                      onDelete={() => handleDelete(product)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-neutral-200 bg-white md:block">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-neutral-200 text-neutral-500">
                <tr>
                  <th className="px-4 py-2 text-start"></th>
                  <th className="px-4 py-2 text-start">{t("admin.nameEn")}</th>
                  <th className="px-4 py-2 text-start">{t("admin.price")}</th>
                  <th className="px-4 py-2 text-start">{t("admin.inStock")}</th>
                  <th className="px-4 py-2 text-start">{t("admin.active")}</th>
                  <th className="px-4 py-2 text-start"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {products.map((product) => {
                  const imageUrl = productImageUrl(product.image_path);
                  return (
                    <tr key={product.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-2">
                        <div className="h-10 w-10 overflow-hidden rounded-lg bg-neutral-100">
                          {imageUrl && <img src={imageUrl} alt="" className="h-full w-full object-cover" />}
                        </div>
                      </td>
                      <td className="px-4 py-2 font-medium text-neutral-900">
                        {product.name_en} / {product.name_ar}
                        {product.size && <span className="ms-1 text-neutral-400">({product.size})</span>}
                      </td>
                      <td className="px-4 py-2">
                        {formatPrice(product.price, i18n.language)}
                        {shouldShowUnit(product.unit) && (
                          <span className="text-neutral-400"> / {t(`unit.${product.unit}`)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge ok={product.in_stock} yesLabel={t("admin.inStock")} noLabel={t("product.outOfStock")} />
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge ok={product.is_active} yesLabel={t("admin.active")} noLabel={t("admin.hidden")} />
                      </td>
                      <td className="px-4 py-2">
                        <ProductActions
                          onEdit={() => setFormMode({ kind: "edit", product })}
                          onDiscounts={() => setDiscountsProduct(product)}
                          onDelete={() => handleDelete(product)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {discountsProduct && (
        <ProductDiscountsModal
          product={discountsProduct}
          onClose={() => {
            setDiscountsProduct(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
