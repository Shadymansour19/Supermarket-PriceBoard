import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProductForm, type ProductFormValues } from "../../components/admin/ProductForm";
import { fetchCategoryTree } from "../../lib/categories";
import { uploadProductImage } from "../../lib/imageUpload";
import { formatPrice } from "../../lib/localize";
import { createProduct, deleteProduct, fetchProducts, updateProduct } from "../../lib/products";
import { productImageUrl } from "../../lib/supabase";
import type { CategoryWithChildren, Product } from "../../types/database";

type FormMode = { kind: "create" } | { kind: "edit"; product: Product };

export function AdminProductsPage() {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
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

  async function handleSubmit(values: ProductFormValues, imageFile: File | null) {
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
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">{t("admin.products")}</h1>
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
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">
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
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
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
                  <tr key={product.id}>
                    <td className="px-4 py-2">
                      <div className="h-10 w-10 overflow-hidden rounded bg-neutral-100">
                        {imageUrl && (
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-medium text-neutral-900">
                      {product.name_en} / {product.name_ar}
                      {product.size && <span className="ms-1 text-neutral-400">({product.size})</span>}
                    </td>
                    <td className="px-4 py-2">
                      {formatPrice(product.price, i18n.language)}{" "}
                      <span className="text-neutral-400">/ {t(`unit.${product.unit}`)}</span>
                    </td>
                    <td className="px-4 py-2">{product.in_stock ? "✅" : "—"}</td>
                    <td className="px-4 py-2">{product.is_active ? "✅" : "—"}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormMode({ kind: "edit", product })}
                          className="text-emerald-700 hover:underline"
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          className="text-red-600 hover:underline"
                        >
                          {t("common.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
