import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "success" | "danger" | "ghost" | "dark";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  dark: "bg-slate-900 text-white hover:bg-slate-800"
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: "sm" | "md" };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", loading = false, size = "md", className, children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        variants[variant],
        className
      )}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
