import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "./Button";

export function PageLoader({ label = "Yükleniyor..." }: { label?: string }) {
  return (
    <div className="grid min-h-[240px] place-items-center text-slate-500" role="status">
      <div className="flex items-center gap-3 text-sm">
        <Loader2 className="animate-spin" size={20} aria-hidden />
        {label}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="grid min-h-[240px] place-items-center rounded-lg border border-red-200 bg-red-50 p-6 text-center" role="alert">
      <div>
        <AlertTriangle className="mx-auto text-red-500" size={28} aria-hidden />
        <p className="mt-3 text-sm font-medium text-red-800">{message}</p>
        {onRetry && (
          <Button variant="secondary" className="mt-4" onClick={onRetry}>
            Tekrar dene
          </Button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-12 text-center">
      <div>
        <Inbox className="mx-auto text-slate-300" size={36} aria-hidden />
        <p className="mt-3 font-semibold text-slate-800">{title}</p>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
