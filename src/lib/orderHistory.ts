const STORAGE_KEY = "hamada_order_history";
const MAX_ENTRIES = 50;

export type OrderHistoryLineItem = {
  productId: string;
  /** Snapshotted at order time (localized to whichever language was active
   * then) — not re-fetched later, so a since-renamed or since-removed
   * product still shows accurately in past orders. */
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type OrderHistoryEntry = {
  id: string;
  createdAt: string;
  items: OrderHistoryLineItem[];
  total: number;
};

function readEntries(): OrderHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Per-device order history (no accounts/server orders in this app — see
 * SPEC.md). There's no way to actually confirm a wa.me order message was
 * sent (WhatsApp gives web pages no callback for that at all), so this is
 * recorded optimistically at the moment "Order via WhatsApp" is clicked —
 * the closest available signal to "the customer placed this order."
 */
export function recordOrder(items: OrderHistoryLineItem[], total: number): void {
  try {
    const entry: OrderHistoryEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      items,
      total,
    };
    const next = [entry, ...readEntries()].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort — losing the history entry doesn't affect the order
    // itself, which already went out via WhatsApp independently.
  }
}

export function getOrderHistory(): OrderHistoryEntry[] {
  return readEntries();
}

export function clearOrderHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do — best-effort, same as everywhere else here.
  }
}
