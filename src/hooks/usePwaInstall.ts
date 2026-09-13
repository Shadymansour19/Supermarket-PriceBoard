import { useCallback, useEffect, useState } from "react";

/** Chrome/Edge/Android fire this instead of installing immediately, so the
 *  page can show its own "Install" button and trigger the native confirm
 *  dialog on demand via `prompt()`. Not in lib.dom.d.ts yet. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own (non-standard) flag for "opened from the home screen".
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/** Drives the "Install this app" banner: captures Chromium's install prompt
 *  so it can be triggered from our own button (instead of the browser's
 *  three-dot menu), and flags iOS Safari separately since it never fires
 *  `beforeinstallprompt` — there, the caller falls back to on-screen
 *  instructions for the manual Share → Add to Home Screen steps. */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // One-shot: Chromium won't reuse this event, so drop it either way.
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return {
    installed,
    canPrompt: deferredPrompt !== null,
    isIOS: isIOS() && !installed,
    promptInstall,
  };
}
