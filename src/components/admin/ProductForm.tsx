import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { flattenCategoryTree } from "../../lib/categories";
import { productImageUrl } from "../../lib/supabase";
import { PRODUCT_UNITS, type CategoryWithChildren, type Product, type ProductUnit } from "../../types/database";
import { CameraCaptureModal } from "./CameraCaptureModal";
import { ImageCropModal } from "./ImageCropModal";
import { ImageSourceSheet } from "./ImageSourceSheet";

const supportsLiveCamera = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

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
  onSubmit: (values: ProductFormValues, imageFile: File | null, removeImage: boolean) => Promise<void>;
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
  const [removeImage, setRemoveImage] = useState(false);
  // A file picked from disk but not yet cropped/confirmed — held here just
  // long enough to show the crop modal, then discarded either way.
  const [cropSource, setCropSource] = useState<{ src: string; fileName: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    () => productImageUrl(initial?.image_path ?? null),
  );
  const [submitting, setSubmitting] = useState(false);
  const [showSourceSheet, setShowSourceSheet] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  // Fallback only: used when the browser has no getUserMedia support, so the
  // live CameraCaptureModal can't run.
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

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

  function handleCameraCapture(file: File) {
    setShowCamera(false);
    setCropSource({ src: URL.createObjectURL(file), fileName: `camera-${Date.now()}.jpg` });
  }

  function handleCropCancel() {
    if (cropSource) URL.revokeObjectURL(cropSource.src);
    setCropSource(null);
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
        <div className="flex items-center gap-3">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-300">
                <span className="text-2xl">🛒</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div>
              <button
                type="button"
                onClick={() => setShowSourceSheet(true)}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              >
                {t("admin.addImage")}
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
              {/* `capture` opens the device camera directly, skipping any
                  chooser — the source sheet already asked which is wanted. */}
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

      {showSourceSheet && (
        <ImageSourceSheet
          onTakePhoto={() => {
            setShowSourceSheet(false);
            if (supportsLiveCamera) setShowCamera(true);
            else cameraInputRef.current?.click();
          }}
          onChooseFromGallery={() => {
            setShowSourceSheet(false);
            galleryInputRef.current?.click();
          }}
          onCancel={() => setShowSourceSheet(false)}
        />
      )}
      {showCamera && <CameraCaptureModal onCapture={handleCameraCapture} onCancel={() => setShowCamera(false)} />}
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
