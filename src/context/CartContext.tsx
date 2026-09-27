import { createContext, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "hamada_cart";

export type CartItem = { productId: string; quantity: number };

function readStored(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Private-browsing storage can throw, or the stored value can be
    // corrupt — either way, starting empty is a safe fallback.
    return [];
  }
}

function persist(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Best-effort — the cart still works for the rest of the tab session
    // even if it can't survive a reload.
  }
}

type CartState = {
  items: CartItem[];
  /** Sum of every item's quantity — what the FAB/header badges show. */
  itemCount: number;
  quantityOf: (productId: string) => number;
  /** Adds to whatever quantity of this product is already in the cart. */
  addToCart: (productId: string, quantity: number) => void;
  /** Sets the exact quantity; 0 or less removes the item. */
  setItemQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartState | null>(null);

/**
 * Per-device shopping cart (no accounts in this app — see SPEC.md),
 * persisted to localStorage. Mirrors FavoritesContext's shape/pattern. The
 * cart itself never contacts the server — an order is just a WhatsApp
 * message assembled from these ids/quantities, sent to the store's own
 * number for a human to actually fulfill.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStored);

  function addToCart(productId: string, quantity: number) {
    if (quantity <= 0) return;
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      const next = existing
        ? prev.map((item) =>
            item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item,
          )
        : [...prev, { productId, quantity }];
      persist(next);
      return next;
    });
  }

  function setItemQuantity(productId: string, quantity: number) {
    setItems((prev) => {
      const next =
        quantity <= 0
          ? prev.filter((item) => item.productId !== productId)
          : prev.map((item) => (item.productId === productId ? { ...item, quantity } : item));
      persist(next);
      return next;
    });
  }

  function removeFromCart(productId: string) {
    setItems((prev) => {
      const next = prev.filter((item) => item.productId !== productId);
      persist(next);
      return next;
    });
  }

  function clearCart() {
    setItems([]);
    persist([]);
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        quantityOf: (productId) => items.find((item) => item.productId === productId)?.quantity ?? 0,
        addToCart,
        setItemQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
