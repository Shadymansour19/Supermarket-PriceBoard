import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ImageCropModal } from "./ImageCropModal";
import { categoryImageUrl } from "../../lib/supabase";
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
  onSubmit: (values: CategoryFormValues, imageFile: File | null, removeImage: boolean) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initial?.name_ar ?? "");
  const [parentId, setParentId] = useState(initial?.parent_id ?? initialParentId ?? "");
  const [submitting, setSubmitting] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  // A file picked from disk but not yet cropped/confirmed — held here just
  // long enough to show the crop modal, then discarded either way.
  const [cropSource, setCropSource] = useState<{ src: string; fileName: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => categoryImageUrl(initial?.image_path ?? null));
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Show the newly cropped file immediately; fall back to the category's
  // existing image (or nothing, if removed) once there's no pending file.
  useEffect(() => {
    if (removeImage) {
      setPreviewUrl(null);
      return;
    }
    if (!imageFile) {
      setPreviewUrl(categoryImageUrl(initial?.image_path ?? null));
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile, removeImage, initial?.image_path]);

  function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setCropSource({ src: URL.createObjectURL(file), fileName: `${file.name.replace(/\.[^.]+$/, "")}.jpg` });
  }

  function handleCropConfirm(croppedFile: File) {
    if (cropSource) URL.revokeObjectURL(cropSource.src);
    setCropSource(null);
    setImageFile(croppedFile);
    setRemoveImage(false);
  }

  function handleCropCancel() {
    if (cropSource) URL.revokeObjectURL(cropSource.src);
    setCropSource(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ name_en: nameEn, name_ar: nameAr, parent_id: parentId || null }, imageFile, removeImage);
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
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-neutral-600">{t("admin.image")}</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t("admin.uploadPhoto")}
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-300">
                <span className="text-xl">🏷️</span>
              </div>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-transparent transition group-hover:bg-black/40 group-hover:text-white">
              {t("admin.uploadPhoto")}
            </span>
          </button>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="self-start rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {t("admin.uploadPhoto")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                handleFileSelected(e.target.files?.[0]);
                e.target.value = ""; // allow re-selecting the same file later
              }}
              className="hidden"
            />
            <div className="flex gap-3">
              {imageFile && (
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="self-start text-xs text-neutral-500 hover:underline"
                >
                  {t("admin.clearImage")}
                </button>
              )}
              {previewUrl && !removeImage && (
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setRemoveImage(true);
                  }}
                  className="self-start text-xs text-red-600 hover:underline"
                >
                  {t("admin.removeImage")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {cropSource && (
        <ImageCropModal
          imageSrc={cropSource.src}
          fileName={cropSource.fileName}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}

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
