const STORAGE_KEY = "hamada_recently_viewed";
const MAX_ENTRIES = 12;

/** Most-recently-viewed first. Re-viewing a product moves it back to the
 * front instead of leaving a stale second entry. No context/provider here
 * (unlike favorites/cart) — the two places that touch this (recording a
 * view on the product page, reading the list on the home page) never need
 * to react to each other live within the same render tree. */
export function recordProductView(productId: string): void {
  try {
    const next = [productId, ...readIds().filter((id) => id !== productId)].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private-browsing storage can throw — recently-viewed just won't
    // persist for this session, which is a harmless degradation.
  }
}

export function getRecentlyViewedIds(): string[] {
  return readIds();
}

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
