import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Live in-page camera capture via getUserMedia, rather than handing off to
 * the OS camera app through `<input capture>`. On Android that handoff can
 * background the tab hard enough that Chrome kills and reloads it while the
 * camera app is open — the page comes back fresh, losing all form state and
 * silently dropping the photo. Staying on this page entirely avoids that.
 */
export function CameraCaptureModal({
  onCapture,
  onCancel,
}: {
  onCapture: (file: File) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError(t("admin.cameraUnavailable")));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [t]);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">{t("admin.takePhoto")}</h2>

        {error ? (
          <p className="mb-3 text-sm text-red-600">{error}</p>
        ) : (
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-900">
            {/* muted + playsInline: required for autoplay on iOS Safari */}
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {!error && (
            <button
              type="button"
              onClick={handleCapture}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {t("admin.capture")}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
