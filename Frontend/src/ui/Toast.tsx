import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";

export type ToastTone = "ok" | "err" | "warn" | "mute";

interface ToastItem {
  id: number;
  text: string;
  tone: ToastTone;
  leaving: boolean;
  action?: { label: string; run: () => void };
}

type ToastFn = (text: string, tone?: ToastTone, action?: { label: string; run: () => void }) => void;

const ToastContext = createContext<ToastFn | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 300);
  }, []);

  const toast = useCallback<ToastFn>(
    (text, tone = "ok", action) => {
      nextId.current += 1;
      const id = nextId.current;
      setItems((list) => [...list, { id, text, tone, leaving: false, action }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={"toast" + (t.leaving ? " leaving" : "")}>
            <span className={"ti " + (t.tone === "ok" ? "" : t.tone)}>
              <Icon name={t.tone === "ok" ? "check" : t.tone === "err" ? "x" : "alert"} />
            </span>
            <span className="tt">{t.text}</span>
            {t.action && (
              <button
                className="tbtn"
                onClick={() => {
                  t.action?.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
