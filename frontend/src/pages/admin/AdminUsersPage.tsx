import { useEffect, useMemo, useState } from "react";
import { Edit2, Save, Trash2, X } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { ApiResponse, Department, Role, SupportUnit, User } from "../../types";

type UserForm = {
  id?: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string;
  supportUnitId: string;
};

const emptyForm: UserForm = { name: "", email: "", role: "EMPLOYEE", departmentId: "", supportUnitId: "" };
const roles: Role[] = ["EMPLOYEE", "IT_STAFF", "ADMIN"];

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [supportUnits, setSupportUnits] = useState<SupportUnit[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [query, setQuery] = useState("");

  async function loadUsers() {
    const res = await api.get<ApiResponse<User[]>>("/users");
    setUsers(res.data.data);
  }

  useEffect(() => {
    loadUsers();
    api.get<ApiResponse<Department[]>>("/departments").then((res) => setDepartments(res.data.data));
    api.get<ApiResponse<SupportUnit[]>>("/support-units").then((res) => setSupportUnits(res.data.data));
  }, []);

  const filtered = useMemo(() => users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase())), [query, users]);
  const editing = Boolean(form.id);

  function edit(user: User) {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId ?? "",
      supportUnitId: user.supportUnitId ?? ""
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.id) return;
    await api.patch(`/users/${form.id}`, {
      name: form.name,
      email: form.email,
      role: form.role,
      departmentId: form.role === "EMPLOYEE" ? form.departmentId || null : null,
      supportUnitId: form.role === "IT_STAFF" ? form.supportUnitId || null : null
    });
    setForm(emptyForm);
    await loadUsers();
  }

  async function remove(id: string) {
    const confirmed = window.confirm("Bu kullanici silinsin mi?");
    if (!confirmed) return;
    await api.delete(`/users/${id}`);
    await loadUsers();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Card className="h-fit">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-950">Kullanici duzenle</h1>
            <p className="text-sm text-slate-500">Rol, departman ve destek ekibi atamalari.</p>
          </div>
          {editing && <button onClick={() => setForm(emptyForm)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={17} /></button>}
        </div>
        {editing ? (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Ad soyad</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">E-posta</span>
              <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Rol</span>
              <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as Role }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            {form.role === "EMPLOYEE" && (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Departman</span>
                <select value={form.departmentId} onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                  <option value="">Departman yok</option>
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
              </label>
            )}
            {form.role === "IT_STAFF" && (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Destek ekibi</span>
                <select value={form.supportUnitId} onChange={(event) => setForm((current) => ({ ...current, supportUnitId: event.target.value }))} required className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                  <option value="">Secin</option>
                  {supportUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                </select>
              </label>
            )}
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white"><Save size={17} /> Kaydet</button>
          </form>
        ) : (
          <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Duzenlemek icin tablodan bir kullanici secin.</p>
        )}
      </Card>

      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Kullanicilar</h1>
            <p className="text-sm text-slate-500">Sistem rolleri ve organizasyon baglantilari.</p>
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kullanici ara..." className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        </div>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Ad</th><th>E-posta</th><th>Rol</th><th>Departman</th><th>Destek ekibi</th><th className="w-28">Islem</th></tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.department?.name ?? "-"}</td>
                  <td>{user.supportUnit?.name ?? "-"}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => edit(user)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Edit2 size={16} /></button>
                      <button onClick={() => remove(user.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
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
