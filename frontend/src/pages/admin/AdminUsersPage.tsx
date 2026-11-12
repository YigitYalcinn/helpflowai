import { Edit2, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card, PageHeader } from "../../components/ui/Card";
import { EmptyState, ErrorState, PageLoader } from "../../components/ui/States";
import { useAuth } from "../../contexts/AuthContext";
import { useAction } from "../../hooks/useAction";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../lib/api";
import { matchesQuery, roleLabels } from "../../lib/format";
import { Department, Role, SupportUnit, User } from "../../types";

type UserForm = { id?: string; name: string; email: string; password: string; role: Role; departmentId: string; supportUnitId: string };

const emptyForm: UserForm = { name: "", email: "", password: "", role: "EMPLOYEE", departmentId: "", supportUnitId: "" };
const roles: Role[] = ["EMPLOYEE", "IT_STAFF", "ADMIN"];

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const users = useFetch<User[]>("/users");
  const departments = useFetch<Department[]>("/departments");
  const supportUnits = useFetch<SupportUnit[]>("/support-units");
  const { run, busy } = useAction();
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [query, setQuery] = useState("");

  const editing = Boolean(form.id);
  const set = (patch: Partial<UserForm>) => setForm((current) => ({ ...current, ...patch }));
  const filtered = useMemo(
    () => (users.data ?? []).filter((user) => !query.trim() || matchesQuery(`${user.name} ${user.email} ${roleLabels[user.role]} ${user.department?.name ?? ""} ${user.supportUnit?.name ?? ""}`, query)),
    [query, users.data]
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      departmentId: form.role === "EMPLOYEE" ? form.departmentId || null : null,
      supportUnitId: form.role === "IT_STAFF" ? form.supportUnitId || null : null,
      ...(form.password ? { password: form.password } : {})
    };
    const ok = await run("save", () => (form.id ? api.patch(`/users/${form.id}`, payload) : api.post("/users", payload)), form.id ? "Kullanıcı güncellendi." : "Kullanıcı oluşturuldu.");
    if (!ok) return;
    setForm(emptyForm);
    await users.reload();
  }

  async function remove(user: User) {
    if (!window.confirm(`${user.name} silinsin mi?`)) return;
    const ok = await run(`delete-${user.id}`, () => api.delete(`/users/${user.id}`), "Kullanıcı silindi.");
    if (ok) await users.reload();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="h-fit">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">{editing ? "Kullanıcıyı düzenle" : "Yeni kullanıcı"}</h2>
            <p className="text-sm text-slate-500">Rol, departman ve destek ekibi atamaları.</p>
          </div>
          {editing && <button onClick={() => setForm(emptyForm)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Düzenlemeyi iptal et"><X size={17} /></button>}
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="user-name">Ad soyad</label>
            <input id="user-name" value={form.name} onChange={(event) => set({ name: event.target.value })} required minLength={2} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="user-email">E-posta</label>
            <input id="user-email" type="email" value={form.email} onChange={(event) => set({ email: event.target.value })} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="user-password">{editing ? "Yeni şifre" : "Şifre"} {editing && <span className="font-normal text-slate-400">(değiştirmeyecekseniz boş bırakın)</span>}</label>
            <input id="user-password" type="password" autoComplete="new-password" value={form.password} onChange={(event) => set({ password: event.target.value })} required={!editing} minLength={8} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="user-role">Rol</label>
            <select id="user-role" value={form.role} onChange={(event) => set({ role: event.target.value as Role })} className="input" disabled={form.id === me?.id}>
              {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </select>
          </div>
          {form.role === "EMPLOYEE" && (
            <div>
              <label className="label" htmlFor="user-department">Departman</label>
              <select id="user-department" value={form.departmentId} onChange={(event) => set({ departmentId: event.target.value })} className="input">
                <option value="">Departman yok</option>
                {(departments.data ?? []).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </div>
          )}
          {form.role === "IT_STAFF" && (
            <div>
              <label className="label" htmlFor="user-unit">Destek ekibi</label>
              <select id="user-unit" value={form.supportUnitId} onChange={(event) => set({ supportUnitId: event.target.value })} required className="input">
                <option value="">Seçin</option>
                {(supportUnits.data ?? []).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </select>
            </div>
          )}
          <Button type="submit" loading={busy === "save"} className="w-full py-2.5">{editing ? <><Save size={17} /> Kaydet</> : <><Plus size={17} /> Kullanıcı oluştur</>}</Button>
        </form>
      </Card>

      <div className="min-w-0 space-y-5">
        <PageHeader
          title="Kullanıcılar"
          description={`${filtered.length} kullanıcı`}
          actions={<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kullanıcı ara..." className="input w-56" aria-label="Kullanıcı ara" />}
        />
        {users.loading && !users.data ? <PageLoader /> : users.error && !users.data ? <ErrorState message={users.error} onRetry={users.reload} /> : (
          <Card className="overflow-x-auto p-0">
            {filtered.length === 0 ? <EmptyState title="Kullanıcı bulunamadı" /> : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Ad</th>
                    <th className="px-4 py-3 font-semibold">E-posta</th>
                    <th className="px-4 py-3 font-semibold">Rol</th>
                    <th className="px-4 py-3 font-semibold">Departman / Ekip</th>
                    <th className="w-24 px-4 py-3 font-semibold">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-900">{user.name}{user.id === me?.id && <span className="ml-2 text-xs font-normal text-slate-400">(siz)</span>}</td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3 text-slate-600">{roleLabels[user.role]}</td>
                      <td className="px-4 py-3 text-slate-600">{user.supportUnit?.name ?? user.department?.name ?? "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setForm({ id: user.id, name: user.name, email: user.email, password: "", role: user.role, departmentId: user.departmentId ?? "", supportUnitId: user.supportUnitId ?? "" })} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label={`${user.name} kullanıcısını düzenle`}><Edit2 size={16} /></button>
                          {user.id !== me?.id && <button onClick={() => remove(user)} disabled={busy !== null} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50" aria-label={`${user.name} kullanıcısını sil`}><Trash2 size={16} /></button>}
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
