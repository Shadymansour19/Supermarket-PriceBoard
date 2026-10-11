import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AD_WIDTH,
  DEFAULT_PHOTO_ADJUST,
  buildAdCaption,
  renderProductAd,
  type AdSpec,
  type PhotoAdjust,
} from "../../lib/adImage";
import type { Product } from "../../types/database";

/** Generates the Arabic social-media ad for a product — a "new product",
 * "limited-time offer" or "quantity offer" design depending on `spec` —
 * and lets the admin download/share it. */
export function ProductAdModal({ product, spec, onClose }: { product: Product; spec: AdSpec; onClose: () => void }) {
  const { t } = useTranslation();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  // Zoom/pan of the photo inside its circle. The renderer returns the
  // clamped values it actually used, which are fed back in so dragging past
  // the photo's edge doesn't build up a dead zone.
  const [adjust, setAdjust] = useState<PhotoAdjust>(DEFAULT_PHOTO_ADJUST);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const hasPhoto = !!product.image_path;

  useEffect(() => {
    let cancelled = false;
    renderProductAd(product, spec, adjust)
      .then((result) => {
        if (cancelled) return;
        setBlob(result.blob);
        if (result.adjust.x !== adjust.x || result.adjust.y !== adjust.y) setAdjust(result.adjust);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [product, spec, adjust]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!hasPhoto) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    // Preview pixels -> poster pixels.
    const factor = AD_WIDTH / e.currentTarget.clientWidth;
    const dx = (e.clientX - drag.current.x) * factor;
    const dy = (e.clientY - drag.current.y) * factor;
    drag.current = { x: e.clientX, y: e.clientY };
    setAdjust((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }

  useEffect(() => {
    if (!blob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const caption = buildAdCaption(product, spec);
  const fileName = `ad-${spec.kind}-${product.id}.png`;

  function download() {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = fileName;
    a.click();
  }

  async function share() {
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
      } else {
        download();
      }
    } catch {
      // Share sheet dismissed by the user — nothing to do.
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the caption is still visible to select by hand.
    }
  }

  const buttonClass =
    "rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-full w-full max-w-md space-y-3 overflow-y-auto rounded-xl bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading text-sm font-semibold text-neutral-900">{t(`admin.adTitle_${spec.kind}`)}</h2>

        <div
          className={`aspect-[1080/1350] w-full touch-none overflow-hidden rounded-lg bg-neutral-100 ${
            hasPhoto ? "cursor-move" : ""
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="" draggable={false} className="h-full w-full select-none" />
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-neutral-500">
              {error ? t("common.error") : t("admin.adGenerating")}
            </p>
          )}
        </div>

        {hasPhoto && (
          <div className="space-y-1">
            <p className="text-xs text-neutral-500">{t("admin.adDragHint")}</p>
            <div className="flex items-center gap-3">
              <label className="text-xs text-neutral-600" htmlFor="ad-zoom">
                {t("admin.adZoom")}
              </label>
              <input
                id="ad-zoom"
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={adjust.zoom}
                onChange={(e) => setAdjust((prev) => ({ ...prev, zoom: Number(e.target.value) }))}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setAdjust(DEFAULT_PHOTO_ADJUST)}
                className="text-xs text-emerald-700 hover:underline"
              >
                {t("admin.adReset")}
              </button>
            </div>
          </div>
        )}

        <textarea
          readOnly
          dir="rtl"
          rows={5}
          value={caption}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!blob}
            onClick={share}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {t("admin.adShare")}
          </button>
          <button type="button" disabled={!blob} onClick={download} className={buttonClass}>
            {t("admin.adDownload")}
          </button>
          <button type="button" onClick={copyCaption} className={buttonClass}>
            {copied ? t("admin.adCopied") : t("admin.adCopyCaption")}
          </button>
          <button type="button" onClick={onClose} className={buttonClass}>
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
