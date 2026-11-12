import { Edit2, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card, PageHeader } from "../../components/ui/Card";
import { EmptyState, ErrorState, PageLoader } from "../../components/ui/States";
import { useAction } from "../../hooks/useAction";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../lib/api";
import { matchesQuery } from "../../lib/format";
import { SupportUnit } from "../../types";

type ResourceType = "departments" | "support-units" | "categories";
type Row = { id: string; name: string; description?: string | null; supportUnitId?: string; supportUnit?: { name: string }; isActive?: boolean };
type FormState = { id?: string; name: string; description: string; supportUnitId: string; isActive: boolean };

const copy: Record<ResourceType, { title: string; description: string; singular: string }> = {
  departments: { title: "Departmanlar", description: "Çalışanların bağlı olduğu birimler; raporlamada kullanılır.", singular: "departman" },
  "support-units": { title: "Destek Ekipleri", description: "Talepleri karşılayan BT ekipleri.", singular: "destek ekibi" },
  categories: { title: "Kategoriler", description: "Her kategori, taleplerin yönlendirileceği destek ekibini belirler.", singular: "kategori" }
};

const emptyForm: FormState = { name: "", description: "", supportUnitId: "", isActive: true };

export function AdminResourcePage({ type }: { type: ResourceType }) {
  const rows = useFetch<Row[]>(`/${type}`);
  const supportUnits = useFetch<SupportUnit[]>(type === "categories" ? "/support-units" : null);
  const { run, busy } = useAction();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setForm(emptyForm);
    setQuery("");
  }, [type]);

  const set = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));
  const filtered = useMemo(() => (rows.data ?? []).filter((row) => !query.trim() || matchesQuery(`${row.name} ${row.description ?? ""} ${row.supportUnit?.name ?? ""}`, query)), [query, rows.data]);
  const hasStatus = type !== "departments";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      name: form.name,
      description: form.description.trim() || null,
      ...(type === "categories" ? { supportUnitId: form.supportUnitId } : {}),
      ...(hasStatus ? { isActive: form.isActive } : {})
    };
    const ok = await run("save", () => (form.id ? api.patch(`/${type}/${form.id}`, payload) : api.post(`/${type}`, payload)), form.id ? "Kayıt güncellendi." : "Kayıt oluşturuldu.");
    if (!ok) return;
    setForm(emptyForm);
    await rows.reload();
  }

  async function remove(row: Row) {
    if (!window.confirm(`"${row.name}" silinsin mi?`)) return;
    const ok = await run(`delete-${row.id}`, () => api.delete(`/${type}/${row.id}`), "Kayıt silindi.");
    if (ok) await rows.reload();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="h-fit">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-950">{form.id ? "Kaydı düzenle" : `Yeni ${copy[type].singular}`}</h2>
          {form.id && <button onClick={() => setForm(emptyForm)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Düzenlemeyi iptal et"><X size={17} /></button>}
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="resource-name">Ad</label>
            <input id="resource-name" value={form.name} onChange={(event) => set({ name: event.target.value })} required minLength={2} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="resource-description">Açıklama</label>
            <textarea id="resource-description" value={form.description} onChange={(event) => set({ description: event.target.value })} rows={3} maxLength={500} className="input" />
          </div>
          {type === "categories" && (
            <div>
              <label className="label" htmlFor="resource-unit">Destek ekibi</label>
              <select id="resource-unit" value={form.supportUnitId} onChange={(event) => set({ supportUnitId: event.target.value })} required className="input">
                <option value="">Seçin</option>
                {(supportUnits.data ?? []).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </select>
            </div>
          )}
          {hasStatus && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(event) => set({ isActive: event.target.checked })} className="h-4 w-4 rounded border-slate-300" />
              Aktif <span className="font-normal text-slate-400">(pasif kayıtlar yeni taleplerde seçilemez)</span>
            </label>
          )}
          <Button type="submit" loading={busy === "save"} className="w-full py-2.5">{form.id ? <><Save size={17} /> Güncelle</> : <><Plus size={17} /> Oluştur</>}</Button>
        </form>
      </Card>

      <div className="min-w-0 space-y-5">
        <PageHeader
          title={copy[type].title}
          description={copy[type].description}
          actions={<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ara..." className="input w-56" aria-label="Kayıt ara" />}
        />
        {rows.loading && !rows.data ? <PageLoader /> : rows.error && !rows.data ? <ErrorState message={rows.error} onRetry={rows.reload} /> : (
          <Card className="overflow-x-auto p-0">
            {filtered.length === 0 ? <EmptyState title="Kayıt bulunamadı" /> : (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Ad</th>
                    <th className="px-4 py-3 font-semibold">Açıklama</th>
                    {type === "categories" && <th className="px-4 py-3 font-semibold">Destek ekibi</th>}
                    {hasStatus && <th className="px-4 py-3 font-semibold">Durum</th>}
                    <th className="w-24 px-4 py-3 font-semibold">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-3 text-slate-600">{row.description || "-"}</td>
                      {type === "categories" && <td className="px-4 py-3 text-slate-600">{row.supportUnit?.name ?? "-"}</td>}
                      {hasStatus && <td className="px-4 py-3"><span className={row.isActive ? "text-emerald-700" : "text-slate-400"}>{row.isActive ? "Aktif" : "Pasif"}</span></td>}
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setForm({ id: row.id, name: row.name, description: row.description ?? "", supportUnitId: row.supportUnitId ?? "", isActive: row.isActive ?? true })} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label={`${row.name} kaydını düzenle`}><Edit2 size={16} /></button>
                          <button onClick={() => remove(row)} disabled={busy !== null} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50" aria-label={`${row.name} kaydını sil`}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
