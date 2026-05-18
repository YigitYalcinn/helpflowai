import { useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Trash2, X } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { ApiResponse, SupportUnit } from "../../types";

type ResourceType = "departments" | "support-units" | "categories";
type Row = { id: string; name: string; description?: string; supportUnitId?: string; supportUnit?: { name: string }; isActive?: boolean };
type FormState = { id?: string; name: string; description: string; supportUnitId: string; isActive: boolean };

const titles: Record<ResourceType, string> = {
  departments: "Departmanlar",
  "support-units": "Destek ekipleri",
  categories: "Kategoriler"
};

const emptyForm: FormState = { name: "", description: "", supportUnitId: "", isActive: true };

export function AdminResourcePage({ type }: { type: ResourceType }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [supportUnits, setSupportUnits] = useState<SupportUnit[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState("");

  async function load() {
    const res = await api.get<ApiResponse<Row[]>>(`/${type}`);
    setRows(res.data.data);
  }

  useEffect(() => {
    load();
    api.get<ApiResponse<SupportUnit[]>>("/support-units").then((res) => setSupportUnits(res.data.data));
    setForm(emptyForm);
  }, [type]);

  const filtered = useMemo(() => rows.filter((row) => `${row.name} ${row.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [query, rows]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = buildPayload(type, form);
    if (form.id) {
      await api.patch(`/${type}/${form.id}`, payload);
    } else {
      await api.post(`/${type}`, payload);
    }
    setForm(emptyForm);
    await load();
  }

  async function remove(id: string) {
    const confirmed = window.confirm("Bu kayit silinsin mi?");
    if (!confirmed) return;
    await api.delete(`/${type}/${id}`);
    await load();
  }

  function edit(row: Row) {
    setForm({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      supportUnitId: row.supportUnitId ?? "",
      isActive: row.isActive ?? true
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Card className="h-fit">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-950">{form.id ? "Kaydi duzenle" : "Yeni kayit"}</h1>
          {form.id && <button onClick={() => setForm(emptyForm)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={17} /></button>}
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Ad</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Aciklama</span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          {type === "categories" && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Destek ekibi</span>
              <select value={form.supportUnitId} onChange={(event) => setForm((current) => ({ ...current, supportUnitId: event.target.value }))} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="">Secin</option>
                {supportUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </select>
            </label>
          )}
          {(type === "categories" || type === "support-units") && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
              Aktif
            </label>
          )}
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white">
            <Plus size={17} />
            {form.id ? "Guncelle" : "Olustur"}
          </button>
        </form>
      </Card>

      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">{titles[type]}</h1>
            <p className="text-sm text-slate-500">Admin tarafindan yonetilen temel sistem kayitlari.</p>
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ara..." className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </div>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Ad</th><th>Aciklama</th><th>Destek ekibi</th><th>Aktif</th><th className="w-28">Islem</th></tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td>{row.description ?? "-"}</td>
                  <td>{row.supportUnit?.name ?? "-"}</td>
                  <td>{row.isActive === undefined ? "-" : row.isActive ? "Evet" : "Hayir"}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => edit(row)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Edit2 size={16} /></button>
                      <button onClick={() => remove(row.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function buildPayload(type: ResourceType, form: FormState) {
  const base = { name: form.name, description: form.description || undefined };
  if (type === "categories") return { ...base, supportUnitId: form.supportUnitId, isActive: form.isActive };
  if (type === "support-units") return { ...base, isActive: form.isActive };
  return base;
}
