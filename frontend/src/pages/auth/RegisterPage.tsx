import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { ApiResponse, Department } from "../../types";

const schema = z.object({
  name: z.string().min(2, "Ad soyad zorunlu"),
  email: z.string().email("Gecerli bir e-posta girin"),
  password: z.string().min(8, "Sifre en az 8 karakter olmali"),
  departmentId: z.string().min(1, "Departman secin")
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { departmentId: "" } });

  useEffect(() => {
    api
      .get<ApiResponse<Department[]>>("/public/departments")
      .then((res) => setDepartments(Array.isArray(res.data.data) ? res.data.data : []))
      .catch(() => setDepartments([]));
  }, []);

  async function onSubmit(values: FormValues) {
    await registerUser(values);
    navigate("/employee/dashboard");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="text-xl font-bold text-slate-950">Yeni calisan hesabi</h1>
        <p className="mt-1 text-sm text-slate-500">Departman secimi ticket yonlendirme ve raporlama icin kullanilir.</p>
        <div className="mt-6 space-y-4">
          <FieldError message={form.formState.errors.name?.message} />
          <input placeholder="Ad Soyad" className="w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register("name")} />
          <FieldError message={form.formState.errors.email?.message} />
          <input placeholder="E-posta" className="w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register("email")} />
          <FieldError message={form.formState.errors.password?.message} />
          <input type="password" placeholder="Sifre" className="w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register("password")} />
          <FieldError message={form.formState.errors.departmentId?.message} />
          <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" {...form.register("departmentId")}>
            <option value="">Departman secin</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <button className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white">Kayit Ol</button>
        </div>
        <Link className="mt-5 block text-center text-sm font-semibold text-brand-600" to="/login">Girise don</Link>
      </form>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="-mb-3 text-xs font-medium text-red-600">{message}</p>;
}
