import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { CloseIcon } from "../ContactIcons";
import { productImageUrl } from "../../lib/supabase";
import { PRODUCT_UNITS, type CategoryWithChildren, type Product, type ProductImage, type ProductUnit } from "../../types/database";
import { CameraCaptureModal } from "./CameraCaptureModal";
import { ImageCropModal } from "./ImageCropModal";

const supportsLiveCamera = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

/** A product's category can be a top-level category directly, or one of its
 * subcategories — this finds which top-level entry (if any) `categoryId`
 * belongs under, so the picker can preselect the right top category. */
function findTopCategoryId(categoryTree: CategoryWithChildren[], categoryId: string): string {
  const top = categoryTree.find((c) => c.id === categoryId || c.children.some((child) => child.id === categoryId));
  return top?.id ?? categoryTree[0]?.id ?? "";
}

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
  initialExtraImages,
  onSubmit,
  onCancel,
}: {
  categoryTree: CategoryWithChildren[];
  initial?: Product;
  /** Existing extra images (beyond the cover photo), when editing — empty/
   * undefined for a new product, which can't have any yet. */
  initialExtraImages?: ProductImage[];
  onSubmit: (
    values: ProductFormValues,
    imageFile: File | null,
    removeImage: boolean,
    extraImageFiles: File[],
    removedExtraImageIds: string[],
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initial?.name_ar ?? "");
  const [descriptionEn, setDescriptionEn] = useState(initial?.description_en ?? "");
  const [descriptionAr, setDescriptionAr] = useState(initial?.description_ar ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [unit, setUnit] = useState<ProductUnit>(initial?.unit ?? "each");
  const [size, setSize] = useState(initial?.size ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? categoryTree[0]?.id ?? "");
  // Which top-level category the picker below is showing subcategories
  // for — derived once from the product's current category, then tracked
  // separately so switching it doesn't require re-deriving from categoryId.
  const [topCategoryId, setTopCategoryId] = useState(() =>
    findTopCategoryId(categoryTree, initial?.category_id ?? categoryTree[0]?.id ?? ""),
  );
  const subcategories = categoryTree.find((c) => c.id === topCategoryId)?.children ?? [];

  function handleTopCategoryChange(newTopId: string) {
    setTopCategoryId(newTopId);
    // Default to the top category itself ("general") until a subcategory is chosen.
    setCategoryId(newTopId);
  }
  const [inStock, setInStock] = useState(initial?.in_stock ?? true);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  // Extra images (beyond the cover) — existing ones not yet removed, newly
  // added files pending upload, and which existing rows to delete on save.
  const [extraImages, setExtraImages] = useState<ProductImage[]>(initialExtraImages ?? []);
  const [newExtraImages, setNewExtraImages] = useState<{ file: File; previewUrl: string }[]>([]);
  const [removedExtraImageIds, setRemovedExtraImageIds] = useState<string[]>([]);
  // Which image slot a picked/captured file is for — the crop modal and
  // gallery/camera inputs below are shared between the cover photo and
  // "add an extra image", so this is what tells the confirm handler which
  // one to update.
  const [cropTarget, setCropTarget] = useState<"cover" | "extra">("cover");
  // A file picked from disk but not yet cropped/confirmed — held here just
  // long enough to show the crop modal, then discarded either way.
  const [cropSource, setCropSource] = useState<{ src: string; fileName: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => productImageUrl(initial?.image_path ?? null));
  const [submitting, setSubmitting] = useState(false);
  // Which target the live-camera modal is open for, if any — same
  // cover/extra split as `cropTarget` (and keeps it in sync: see
  // `openCamera` below), since this modal is shared between both.
  const [showCamera, setShowCamera] = useState<"cover" | "extra" | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  // Fallback only: used when the browser has no getUserMedia support, so the
  // live CameraCaptureModal can't run.
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const extraGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const extraCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Show the newly cropped file immediately; fall back to the product's
  // existing image (or nothing, if removed) once there's no pending file.
  useEffect(() => {
    if (removeImage) {
      setPreviewUrl(null);
      return;
    }
    if (!imageFile) {
      setPreviewUrl(productImageUrl(initial?.image_path ?? null));
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile, removeImage, initial?.image_path]);

  function handleFileSelected(file: File | undefined, target: "cover" | "extra" = "cover") {
    if (!file) return;
    setCropTarget(target);
    setCropSource({ src: URL.createObjectURL(file), fileName: `${file.name.replace(/\.[^.]+$/, "")}.jpg` });
  }

  function handleCropConfirm(croppedFile: File) {
    if (cropSource) URL.revokeObjectURL(cropSource.src);
    setCropSource(null);
    if (cropTarget === "extra") {
      setNewExtraImages((prev) => [...prev, { file: croppedFile, previewUrl: URL.createObjectURL(croppedFile) }]);
      return;
    }
    setImageFile(croppedFile);
    setRemoveImage(false);
  }

  /** Opens the live camera modal (or, lacking `getUserMedia` support, the
   * browser's own native camera file picker) for whichever slot — cover or
   * extra — the button that called this is for. */
  function openCamera(target: "cover" | "extra") {
    setCropTarget(target);
    if (supportsLiveCamera) {
      setShowCamera(target);
    } else if (target === "cover") {
      cameraInputRef.current?.click();
    } else {
      extraCameraInputRef.current?.click();
    }
  }

  function handleCameraCapture(file: File) {
    setShowCamera(null);
    setCropSource({ src: URL.createObjectURL(file), fileName: `camera-${Date.now()}.jpg` });
  }

  function handleCropCancel() {
    if (cropSource) URL.revokeObjectURL(cropSource.src);
    setCropSource(null);
  }

  function removeExistingExtraImage(id: string) {
    setExtraImages((prev) => prev.filter((img) => img.id !== id));
    setRemovedExtraImageIds((prev) => [...prev, id]);
  }

  function removeNewExtraImage(index: number) {
    setNewExtraImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

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
        removeImage,
        newExtraImages.map((img) => img.file),
        removedExtraImageIds,
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
      <div className={subcategories.length > 0 ? "" : "sm:col-span-2"}>
        <label className="mb-1 block text-sm text-neutral-600">{t("product.category")}</label>
        <select
          required
          value={topCategoryId}
          onChange={(e) => handleTopCategoryChange(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          {categoryTree.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name_en} / {category.name_ar}
            </option>
          ))}
        </select>
      </div>
      {subcategories.length > 0 && (
        <div>
          <label className="mb-1 block text-sm text-neutral-600">{t("admin.subcategory")}</label>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value={topCategoryId}>{t("admin.noSubcategory")}</option>
            {subcategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name_en} / {category.name_ar}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-neutral-600">{t("admin.image")}</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            aria-label={t("admin.uploadPhoto")}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-300">
                <span className="text-2xl">🛒</span>
              </div>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-transparent transition group-hover:bg-black/40 group-hover:text-white">
              {t("admin.uploadPhoto")}
            </span>
          </button>
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              >
                {t("admin.uploadPhoto")}
              </button>
              <button
                type="button"
                onClick={() => openCamera("cover")}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              >
                {t("admin.captureImage")}
              </button>
              {/* Gallery/file browser — no `capture` attribute. */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handleFileSelected(e.target.files?.[0]);
                  e.target.value = ""; // allow re-selecting the same file later
                }}
                className="hidden"
              />
              {/* Fallback only: used when the browser has no getUserMedia
                  support, so the live CameraCaptureModal can't run. */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  handleFileSelected(e.target.files?.[0]);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </div>
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

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-neutral-600">{t("admin.additionalImages")}</label>
        <div className="flex flex-wrap gap-3">
          {extraImages.map((img) => (
            <div key={img.id} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
              <img src={productImageUrl(img.image_path) ?? undefined} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeExistingExtraImage(img.id)}
                aria-label={t("admin.removeImage")}
                className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
              >
                <CloseIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
          {newExtraImages.map((img, index) => (
            <div key={img.previewUrl} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
              <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeNewExtraImage(index)}
                aria-label={t("admin.removeImage")}
                className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
              >
                <CloseIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => extraGalleryInputRef.current?.click()}
            aria-label={t("admin.addImage")}
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-neutral-300 text-neutral-400 hover:border-emerald-400 hover:text-emerald-600"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="text-[10px]">{t("admin.addImage")}</span>
          </button>
          <button
            type="button"
            onClick={() => openCamera("extra")}
            aria-label={t("admin.captureImage")}
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-neutral-300 text-neutral-400 hover:border-emerald-400 hover:text-emerald-600"
          >
            <span className="text-2xl leading-none">📷</span>
            <span className="text-[10px]">{t("admin.captureImage")}</span>
          </button>
          <input
            ref={extraGalleryInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              handleFileSelected(e.target.files?.[0], "extra");
              e.target.value = "";
            }}
            className="hidden"
          />
          {/* Fallback only: used when the browser has no getUserMedia
              support, so the live CameraCaptureModal can't run. */}
          <input
            ref={extraCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              handleFileSelected(e.target.files?.[0], "extra");
              e.target.value = "";
            }}
            className="hidden"
          />
        </div>
      </div>

      {showCamera && <CameraCaptureModal onCapture={handleCameraCapture} onCancel={() => setShowCamera(null)} />}
      {cropSource && (
        <ImageCropModal
          imageSrc={cropSource.src}
          fileName={cropSource.fileName}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
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
