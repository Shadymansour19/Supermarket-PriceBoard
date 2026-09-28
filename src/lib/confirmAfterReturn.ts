/** How long to keep waiting for the user to come back before giving up —
 * long enough for someone to actually type/send a WhatsApp message and
 * switch back, short enough that a stale listener can't fire from some
 * unrelated tab-switch hours later. */
const RETURN_WINDOW_MS = 10 * 60 * 1000;

/** Hiding-and-showing-again faster than this doesn't count as a real
 * "went to WhatsApp and came back" — some mobile browsers fire a
 * near-instant hidden→visible blip during the hand-off itself (e.g.
 * launching the WhatsApp app via an Android intent), which isn't the user
 * actually returning. Confirmed as the cause of the prompt firing at
 * click time instead of on return — this filters that out. */
const MIN_AWAY_MS = 1200;

/**
 * Calls `onConfirmed` once the user leaves this tab (backgrounding it —
 * switching to the WhatsApp app, or a WhatsApp Web tab taking focus) for
 * at least `MIN_AWAY_MS`, then comes back, within `RETURN_WINDOW_MS` of
 * the first hide. Returning is just the cue to ask — a `wa.me` link gives
 * no actual send-confirmation at all, it just opens WhatsApp with the
 * text pre-filled, so the caller still needs to explicitly ask the user
 * (e.g. a yes/no prompt) whether they actually sent it before treating
 * `onConfirmed` as true confirmation. Does nothing if they never come
 * back for real (closed the tab, switched away and stayed there, etc.) —
 * silently expires instead.
 */
export function confirmAfterReturn(onConfirmed: () => void): void {
  let hiddenAt: number | null = null;

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      hiddenAt ??= Date.now();
      return;
    }
    if (document.visibilityState !== "visible" || hiddenAt === null) return;

    const awayMs = Date.now() - hiddenAt;
    if (awayMs < MIN_AWAY_MS) {
      // Too quick to be a real app-switch — keep waiting for a later,
      // genuine one instead of resetting the whole window.
      hiddenAt = null;
      return;
    }
    cleanup();
    onConfirmed();
  }

  function cleanup() {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.clearTimeout(timeoutId);
  }

  const timeoutId = window.setTimeout(cleanup, RETURN_WINDOW_MS);
  document.addEventListener("visibilitychange", onVisibilityChange);
}
