import { useTranslation } from "react-i18next";

/**
 * A bottom action sheet (mirrors Android/iOS's native "share sheet" look)
 * that lets the admin pick where the product photo comes from before any
 * OS picker opens — since a plain file input's default chooser behavior
 * varies by device/browser and doesn't reliably surface a camera option.
 */
export function ImageSourceSheet({
  onTakePhoto,
  onChooseFromGallery,
  onCancel,
}: {
  onTakePhoto: () => void;
  onChooseFromGallery: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-1 mt-1 h-1 w-10 rounded-full bg-neutral-200 sm:hidden" />
        <button
          type="button"
          onClick={onTakePhoto}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start text-sm font-medium text-neutral-800 hover:bg-neutral-100"
        >
          <span className="text-xl">📷</span>
          {t("admin.takePhoto")}
        </button>
        <button
          type="button"
          onClick={onChooseFromGallery}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start text-sm font-medium text-neutral-800 hover:bg-neutral-100"
        >
          <span className="text-xl">🖼️</span>
          {t("admin.chooseFromGallery")}
        </button>
        <div className="my-1 border-t border-neutral-100" />
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl px-4 py-3 text-sm font-medium text-neutral-500 hover:bg-neutral-100"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
