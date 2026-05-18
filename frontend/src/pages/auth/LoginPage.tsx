import { zodResolver } from "@hookform/resolvers/zod";
import { Cpu } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../../contexts/AuthContext";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "admin@demo.com", password: "Admin123!" }
  });

  async function onSubmit(values: FormValues) {
    const user = await login(values.email, values.password);
    navigate(user.role === "ADMIN" ? "/admin/dashboard" : user.role === "IT_STAFF" ? "/it/dashboard" : "/employee/dashboard");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-soft">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-600 text-white"><Cpu size={22} /></span>
          <div>
            <h1 className="text-xl font-bold text-slate-950">HelpFlow AI</h1>
            <p className="text-sm text-slate-500">Kurumsal IT destek yönetimi</p>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">E-posta</span>
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500" {...register("email")} />
            {errors.email && <span className="text-xs text-red-600">{errors.email.message}</span>}
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Şifre</span>
            <input type="password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500" {...register("password")} />
          </label>
          <button disabled={isSubmitting} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            Giriş Yap
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          Hesabın yok mu? <Link className="font-semibold text-brand-600" to="/register">Kayıt ol</Link>
        </p>
      </div>
    </div>
  );
}
