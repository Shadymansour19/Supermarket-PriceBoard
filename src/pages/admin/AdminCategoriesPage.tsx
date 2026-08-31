import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CategoryForm, type CategoryFormValues } from "../../components/admin/CategoryForm";
import { createCategory, deleteCategory, fetchCategoryTree, updateCategory } from "../../lib/categories";
import type { Category, CategoryWithChildren } from "../../types/database";

type FormMode =
  | { kind: "create"; parentId?: string }
  | { kind: "edit"; category: Category };

export function AdminCategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    return fetchCategoryTree()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleSubmit(values: CategoryFormValues) {
    setActionError(null);
    try {
      if (formMode?.kind === "edit") {
        await updateCategory(formMode.category.id, values);
      } else {
        await createCategory(values);
      }
      setFormMode(null);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(category: Category) {
    if (!confirm(t("common.confirmDelete"))) return;
    setActionError(null);
    try {
      await deleteCategory(category.id);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">{t("admin.categories")}</h1>
        {!formMode && (
          <button
            type="button"
            onClick={() => setFormMode({ kind: "create" })}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t("admin.newCategory")}
          </button>
        )}
      </div>

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      {formMode && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">
            {formMode.kind === "edit" ? t("admin.editCategory") : t("admin.newCategory")}
            {formMode.kind === "create" && formMode.parentId && (
              <span className="ms-1 font-normal text-neutral-500">
                ({t("admin.addSubcategory")}:{" "}
                {categories.find((c) => c.id === formMode.parentId)?.name_en})
              </span>
            )}
          </h2>
          <CategoryForm
            topLevelCategories={categories}
            initial={formMode.kind === "edit" ? formMode.category : undefined}
            initialParentId={formMode.kind === "create" ? formMode.parentId : undefined}
            onSubmit={handleSubmit}
            onCancel={() => setFormMode(null)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500">{t("common.loading")}</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {categories.map((category) => (
            <li key={category.id}>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-medium text-neutral-900">
                  {category.name_en} / {category.name_ar}
                </span>
                <div className="flex items-center gap-3">
                  {!formMode && (
                    <button
                      type="button"
                      onClick={() => setFormMode({ kind: "create", parentId: category.id })}
                      className="text-sm text-emerald-700 hover:underline"
                    >
                      + {t("admin.addSubcategory")}
                    </button>
                  )}
                  <CategoryActions
                    category={category}
                    onEdit={() => setFormMode({ kind: "edit", category })}
                    onDelete={() => handleDelete(category)}
                  />
                </div>
              </div>
              {category.children.length > 0 && (
                <ul className="divide-y divide-neutral-100 ps-8">
                  {category.children.map((child) => (
                    <li key={child.id} className="flex items-center justify-between px-4 py-2">
                      <span className="text-sm text-neutral-700">
                        {child.name_en} / {child.name_ar}
                      </span>
                      <CategoryActions
                        category={child}
                        onEdit={() => setFormMode({ kind: "edit", category: child })}
                        onDelete={() => handleDelete(child)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryActions({
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onEdit} className="text-sm text-emerald-700 hover:underline">
        {t("common.edit")}
      </button>
      <button type="button" onClick={onDelete} className="text-sm text-red-600 hover:underline">
        {t("common.delete")}
      </button>
    </div>
  );
}
