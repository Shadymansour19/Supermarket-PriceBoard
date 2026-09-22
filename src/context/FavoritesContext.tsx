import { createContext, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "hamada_favorites";

function readStored(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    // Private-browsing storage can throw, or the stored value can be
    // corrupt — either way, starting empty is a safe fallback.
    return new Set();
  }
}

function persist(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Best-effort — favoriting still works for the rest of the tab session
    // even if it can't survive a reload.
  }
}

type FavoritesState = {
  favoriteIds: Set<string>;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
};

const FavoritesContext = createContext<FavoritesState | null>(null);

/**
 * Per-device favorites (no accounts in this app — see SPEC.md), persisted
 * to localStorage. A single provider at the app root keeps every consumer
 * (product cards, the detail page, the header count badge) in sync.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(readStored);

  function toggleFavorite(productId: string) {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      persist(next);
      return next;
    });
  }

  return (
    <FavoritesContext.Provider
      value={{ favoriteIds, isFavorite: (id) => favoriteIds.has(id), toggleFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used within a FavoritesProvider");
  return context;
}
