import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { apiError } from "../../lib/api";
import { Department } from "../../types";

const schema = z.object({
  name: z.string().trim().min(2, "Ad soyad zorunlu"),
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
  departmentId: z.string().min(1, "Departman seçin")
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { user, loading, register: registerUser, defaultPath } = useAuth();
  const navigate = useNavigate();
  const departments = useFetch<Department[]>("/public/departments");
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { departmentId: "" } });

  if (!loading && user) return <Navigate to={defaultPath} replace />;

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await registerUser(values);
      navigate("/employee/dashboard", { replace: true });
    } catch (err) {
      setError(apiError(err, "Kayıt tamamlanamadı, lütfen tekrar deneyin."));
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-soft" noValidate>
        <h1 className="text-xl font-bold text-slate-950">Yeni çalışan hesabı</h1>
        <p className="mt-1 text-sm text-slate-500">Departman bilgisi, taleplerinizin raporlanması için kullanılır.</p>
        <div className="mt-6 space-y-4">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
          <div>
            <label className="label" htmlFor="name">Ad Soyad</label>
            <input id="name" autoComplete="name" className="input" {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="email">E-posta</label>
            <input id="email" type="email" autoComplete="username" className="input" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="password">Şifre</label>
            <input id="password" type="password" autoComplete="new-password" className="input" {...register("password")} />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="departmentId">Departman</label>
            <select id="departmentId" className="input" disabled={departments.loading} {...register("departmentId")}>
              <option value="">{departments.loading ? "Yükleniyor..." : "Departman seçin"}</option>
              {(departments.data ?? []).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
            {errors.departmentId && <p className="mt-1 text-xs text-red-600">{errors.departmentId.message}</p>}
            {departments.error && <p className="mt-1 text-xs text-red-600">Departmanlar yüklenemedi. <button type="button" className="font-semibold underline" onClick={departments.reload}>Tekrar dene</button></p>}
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full py-2.5">Kayıt Ol</Button>
        </div>
        <Link className="mt-5 block text-center text-sm font-semibold text-brand-600 hover:text-brand-700" to="/login">Girişe dön</Link>
      </form>
    </div>
  );
}
