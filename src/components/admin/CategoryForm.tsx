import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Category, CategoryWithChildren } from "../../types/database";

export type CategoryFormValues = {
  name_en: string;
  name_ar: string;
  parent_id: string | null;
};

export function CategoryForm({
  topLevelCategories,
  initial,
  initialParentId,
  onSubmit,
  onCancel,
}: {
  topLevelCategories: (Category | CategoryWithChildren)[];
  initial?: Category;
  /** Preselects the parent when creating a fresh category (e.g. from an
   * "Add subcategory" shortcut on a specific parent). Ignored when editing
   * an existing category — `initial.parent_id` wins there. */
  initialParentId?: string;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initial?.name_ar ?? "");
  const [parentId, setParentId] = useState(initial?.parent_id ?? initialParentId ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ name_en: nameEn, name_ar: nameAr, parent_id: parentId || null });
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
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-neutral-600">{t("admin.parentCategory")}</label>
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">{t("admin.topLevel")}</option>
          {topLevelCategories
            .filter((c) => c.id !== initial?.id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en} / {c.name_ar}
              </option>
            ))}
        </select>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {t("common.save")}
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
