import { zodResolver } from "@hookform/resolvers/zod";
import { LifeBuoy } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import { basePathForRole, useAuth } from "../../contexts/AuthContext";
import { apiError } from "../../lib/api";

const schema = z.object({ email: z.string().email("Geçerli bir e-posta girin"), password: z.string().min(1, "Şifre girin") });
type FormValues = z.infer<typeof schema>;

// Shown unless the deployment turns them off; they match the accounts created by the seed script.
const showDemoAccounts = import.meta.env.VITE_SHOW_DEMO_LOGINS !== "false";
const demoAccounts = [
  { label: "Çalışan", email: "employee@demo.com", password: "Employee123!" },
  { label: "BT Personeli", email: "network.it@demo.com", password: "Staff123!" },
  { label: "Yönetici", email: "admin@demo.com", password: "Admin123!" }
];

export function LoginPage() {
  const { user, loading, login, defaultPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!loading && user) return <Navigate to={defaultPath} replace />;

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      const signedIn = await login(values.email, values.password);
      const base = basePathForRole(signedIn.role);
      const from = (location.state as { from?: string } | null)?.from;
      // Only return to the page the user came from if it belongs to their role.
      navigate(from?.startsWith(`${base}/`) ? from : `${base}/dashboard`, { replace: true });
    } catch (err) {
      setError(apiError(err, "Giriş yapılamadı, lütfen tekrar deneyin."));
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-soft">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-600 text-white"><LifeBuoy size={22} /></span>
          <div>
            <h1 className="text-xl font-bold text-slate-950">HelpFlow AI</h1>
            <p className="text-sm text-slate-500">Yapay zekâ destekli BT destek yönetimi</p>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
          <div>
            <label className="label" htmlFor="email">E-posta</label>
            <input id="email" type="email" autoComplete="username" className="input" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="password">Şifre</label>
            <input id="password" type="password" autoComplete="current-password" className="input" {...register("password")} />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full py-2.5">Giriş Yap</Button>
        </form>

        {showDemoAccounts && (
          <div className="mt-6 rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo hesabıyla dene</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setValue("email", account.email, { shouldValidate: true });
                    setValue("password", account.password, { shouldValidate: true });
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-700"
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-sm text-slate-500">
          Hesabın yok mu? <Link className="font-semibold text-brand-600 hover:text-brand-700" to="/register">Kayıt ol</Link>
        </p>
      </div>
    </div>
  );
}
