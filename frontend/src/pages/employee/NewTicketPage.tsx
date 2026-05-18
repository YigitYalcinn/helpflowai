import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { ApiResponse, Category, Ticket } from "../../types";

const schema = z.object({ title: z.string().min(3), description: z.string().min(10), categoryId: z.string().min(1), location: z.string().optional() });
type FormValues = z.infer<typeof schema>;

export function NewTicketPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const navigate = useNavigate();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    api.get<ApiResponse<Category[]>>("/categories").then((res) => setCategories(res.data.data));
  }, []);

  async function onSubmit(values: FormValues) {
    const res = await api.post<ApiResponse<Ticket>>("/tickets", values);
    navigate(`/employee/tickets/${res.data.data.id}`);
  }

  return (
    <Card className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-950">Yeni Ticket Oluştur</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <input placeholder="Başlık" className="w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register("title")} />
        <textarea rows={6} placeholder="Sorunu açıklayın" className="w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register("description")} />
        <select className="w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register("categoryId")}>
          <option value="">Kategori seçin</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <input placeholder="Konum" className="w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register("location")} />
        <button className="rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white">Talep Oluştur</button>
      </form>
    </Card>
  );
}
