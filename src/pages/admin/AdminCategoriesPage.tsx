import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CategoryForm, type CategoryFormValues } from "../../components/admin/CategoryForm";
import { Chevron } from "../../components/Chevron";
import { createCategory, deleteCategory, fetchCategoryTree, updateCategory } from "../../lib/categories";
import type { Category, CategoryWithChildren } from "../../types/database";

type FormMode =
  | { kind: "create"; parentId?: string }
  | { kind: "edit"; category: Category };

/** Same palette as the public CategoriesPage, cycled by row index, so a
 * category reads as a distinct section at a glance here too instead of a
 * flat wall of text — categories have no icon/image of their own. */
const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-indigo-100 text-indigo-700",
];

export function AdminCategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      // Make sure the category just added/edited is actually visible.
      if (values.parent_id) {
        setExpanded((prev) => new Set(prev).add(values.parent_id!));
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
        <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("admin.categories")}</h1>
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
          <h2 className="font-heading mb-3 text-sm font-semibold text-neutral-900">
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
      ) : categories.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-500">
          {t("admin.noCategories")}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {categories.map((category, index) => {
            const isOpen = expanded.has(category.id);
            const hasChildren = category.children.length > 0;

            return (
              <li key={category.id}>
                <div
                  role={hasChildren ? "button" : undefined}
                  tabIndex={hasChildren ? 0 : undefined}
                  aria-expanded={hasChildren ? isOpen : undefined}
                  onClick={hasChildren ? () => toggleExpanded(category.id) : undefined}
                  onKeyDown={
                    hasChildren
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleExpanded(category.id);
                          }
                        }
                      : undefined
                  }
                  className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${
                    hasChildren ? "cursor-pointer hover:bg-neutral-50" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="w-5 shrink-0 text-center text-neutral-400" aria-hidden="true">
                      {hasChildren && <Chevron open={isOpen} />}
                    </span>
                    <span
                      className={`font-heading flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        AVATAR_COLORS[index % AVATAR_COLORS.length]
                      }`}
                      aria-hidden="true"
                    >
                      {category.name_en.charAt(0)}
                    </span>
                    <span className="min-w-0 truncate font-medium text-neutral-900">
                      {category.name_en} / {category.name_ar}
                    </span>
                  </div>
                  {/* Stops a click here from also bubbling up to the
                   * row's own expand/collapse handler. */}
                  <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {!formMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setExpanded((prev) => new Set(prev).add(category.id));
                          setFormMode({ kind: "create", parentId: category.id });
                        }}
                        className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        + {t("admin.addSubcategory")}
                      </button>
                    )}
                    <CategoryActions
                      onEdit={() => setFormMode({ kind: "edit", category })}
                      onDelete={() => handleDelete(category)}
                    />
                  </div>
                </div>
                {hasChildren && isOpen && (
                  <ul className="ms-6 space-y-0.5 border-s border-neutral-200 ps-3 pb-2">
                    {category.children.map((child) => (
                      <li key={child.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 pe-2">
                        <span className="text-sm text-neutral-700">
                          {child.name_en} / {child.name_ar}
                        </span>
                        <CategoryActions
                          onEdit={() => setFormMode({ kind: "edit", category: child })}
                          onDelete={() => handleDelete(child)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CategoryActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
      >
        {t("common.edit")}
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
