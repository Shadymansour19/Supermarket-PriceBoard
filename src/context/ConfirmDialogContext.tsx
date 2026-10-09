import { createContext, useContext, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export type ConfirmOptions = {
  message: string;
  /** Styles the confirm button red instead of the default emerald — for
   * destructive actions (delete, clear history, remove from cart). */
  destructive?: boolean;
};

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

/**
 * App-wide replacement for window.confirm — a single modal instance at the
 * app root, resolved via a promise so call sites barely change
 * (`if (!(await confirmDialog(...))) return;`). The app never uses
 * browser-native confirm/alert dialogs, so every yes/no prompt (clearing
 * history, removing a cart item, deleting a product/category, confirming
 * an order was actually sent) goes through this instead, styled to match
 * the rest of the UI.
 */
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirmDialog: ConfirmFn = (options) => {
    const normalized = typeof options === "string" ? { message: options } : options;
    return new Promise((resolve) => {
      setPending({ ...normalized, resolve });
    });
  };

  function handleChoice(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  return (
    <ConfirmDialogContext.Provider value={confirmDialog}>
      {children}
      {pending && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => handleChoice(false)}
        >
          <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-neutral-900">{pending.message}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleChoice(false)}
                className="font-label rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                {t("common.no")}
              </button>
              <button
                type="button"
                onClick={() => handleChoice(true)}
                className={`font-label rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  pending.destructive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {t("common.yes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) throw new Error("useConfirmDialog must be used within a ConfirmDialogProvider");
  return context;
}
