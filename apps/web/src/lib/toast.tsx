import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ToastContextType {
  toast: (message: string, variant?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string; variant: string }[]>([]);
  let id = 0;

  const toast = useCallback((message: string, variant: "success" | "error" = "success") => {
    const tid = ++id;
    setToasts((prev) => [...prev, { id: tid, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== tid));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-in slide-in-from-right rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              t.variant === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
