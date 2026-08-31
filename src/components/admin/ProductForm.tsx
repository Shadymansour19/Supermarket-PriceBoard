import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { flattenCategoryTree } from "../../lib/categories";
import { PRODUCT_UNITS, type CategoryWithChildren, type Product, type ProductUnit } from "../../types/database";

export type ProductFormValues = {
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  price: string;
  unit: ProductUnit;
  size: string;
  category_id: string;
  in_stock: boolean;
  is_active: boolean;
};

export function ProductForm({
  categoryTree,
  initial,
  onSubmit,
  onCancel,
}: {
  categoryTree: CategoryWithChildren[];
  initial?: Product;
  onSubmit: (values: ProductFormValues, imageFile: File | null) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const flatCategories = flattenCategoryTree(categoryTree);

  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initial?.name_ar ?? "");
  const [descriptionEn, setDescriptionEn] = useState(initial?.description_en ?? "");
  const [descriptionAr, setDescriptionAr] = useState(initial?.description_ar ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [unit, setUnit] = useState<ProductUnit>(initial?.unit ?? "each");
  const [size, setSize] = useState(initial?.size ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? flatCategories[0]?.category.id ?? "");
  const [inStock, setInStock] = useState(initial?.in_stock ?? true);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(
        {
          name_en: nameEn,
          name_ar: nameAr,
          description_en: descriptionEn,
          description_ar: descriptionAr,
          price,
          unit,
          size,
          category_id: categoryId,
          in_stock: inStock,
          is_active: isActive,
        },
        imageFile,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm text-neutral-600">{t("admin.nameEn")}</label>
        <input
          required
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">{t("admin.nameAr")}</label>
        <input
          required
          dir="rtl"
          value={nameAr}
          onChange={(e) => setNameAr(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">{t("admin.descriptionEn")}</label>
        <textarea
          value={descriptionEn}
          onChange={(e) => setDescriptionEn(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">{t("admin.descriptionAr")}</label>
        <textarea
          dir="rtl"
          value={descriptionAr}
          onChange={(e) => setDescriptionAr(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-sm text-neutral-600">{t("admin.price")}</label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-sm text-neutral-600">{t("admin.unit")}</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as ProductUnit)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            {PRODUCT_UNITS.map((u) => (
              <option key={u} value={u}>
                {t(`unit.${u}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">{t("admin.size")}</label>
        <input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="e.g. 500g, 1L, 6-pack"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">{t("product.category")}</label>
        <select
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          {flatCategories.map(({ category, depth }) => (
            <option key={category.id} value={category.id}>
              {"— ".repeat(depth)}
              {category.name_en} / {category.name_ar}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-neutral-600">{t("admin.image")}</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
      </div>
      <div className="flex gap-6 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
          {t("admin.inStock")}
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          {t("admin.active")}
        </label>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? t("admin.uploading") : t("common.save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
