/** How long to keep waiting for the user to come back before giving up —
 * long enough for someone to actually type/send a WhatsApp message and
 * switch back, short enough that a stale listener can't fire from some
 * unrelated tab-switch hours later. */
const RETURN_WINDOW_MS = 10 * 60 * 1000;

/**
 * Calls `onConfirmed` once the user leaves this tab (backgrounding it —
 * switching to the WhatsApp app, or a WhatsApp Web tab taking focus) and
 * then comes back, within `RETURN_WINDOW_MS`. Returning is just the cue to
 * ask — a `wa.me` link gives no actual send-confirmation at all, it just
 * opens WhatsApp with the text pre-filled, so the caller still needs to
 * explicitly ask the user (e.g. a yes/no prompt) whether they actually
 * sent it before treating `onConfirmed` as true confirmation. Does
 * nothing if they never come back (closed the tab, switched away and
 * stayed there, etc.) — silently expires instead.
 */
export function confirmAfterReturn(onConfirmed: () => void): void {
  let didHide = false;

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      didHide = true;
    } else if (document.visibilityState === "visible" && didHide) {
      cleanup();
      onConfirmed();
    }
  }

  function cleanup() {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.clearTimeout(timeoutId);
  }

  const timeoutId = window.setTimeout(cleanup, RETURN_WINDOW_MS);
  document.addEventListener("visibilitychange", onVisibilityChange);
}
