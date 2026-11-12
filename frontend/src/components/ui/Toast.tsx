import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; message: string };
type ToastApi = { success: (message: string) => void; error: (message: string) => void; info: (message: string) => void };

const ToastContext = createContext<ToastApi | undefined>(undefined);

const styles: Record<ToastKind, string> = {
  success: "border-emerald-200 bg-white text-emerald-800",
  error: "border-red-200 bg-white text-red-800",
  info: "border-slate-200 bg-white text-slate-800"
};

const icons = { success: CheckCircle2, error: XCircle, info: Info };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setItems((current) => [...current.slice(-3), { id, kind, message }]);
    // Errors stay longer: they usually need to be read, not just noticed.
    setTimeout(() => dismiss(id), kind === "error" ? 7000 : 4000);
  }, [dismiss]);

  const value = useMemo<ToastApi>(() => ({
    success: (message) => push("success", message),
    error: (message) => push("error", message),
    info: (message) => push("info", message)
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end" aria-live="polite">
        {items.map((item) => {
          const Icon = icons[item.kind];
          return (
            <div key={item.id} role={item.kind === "error" ? "alert" : "status"} className={cn("pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-3 text-sm shadow-soft", styles[item.kind])}>
              <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
              <p className="flex-1 font-medium">{item.message}</p>
              <button onClick={() => dismiss(item.id)} className="rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Bildirimi kapat">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
