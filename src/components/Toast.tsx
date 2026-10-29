import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  push: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const styles: Record<ToastVariant, string> = {
  success: 'border-forest-200 bg-white text-forest-800',
  error: 'border-red-200 bg-white text-red-700',
  info: 'border-sky/50 bg-white text-ink-soft',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback((message: string, variant: ToastVariant = 'info') => {
    counter.current += 1;
    const id = counter.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[1200] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:right-5 sm:top-24 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lift animate-fade-up ${styles[toast.variant]}`}
          >
            <span aria-hidden="true" className="mt-0.5 text-base leading-none">
              {toast.variant === 'success' ? '✓' : toast.variant === 'error' ? '!' : 'i'}
            </span>
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              className="rounded p-0.5 text-ink-faint transition hover:text-ink"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
              aria-label="Dismiss notification"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
