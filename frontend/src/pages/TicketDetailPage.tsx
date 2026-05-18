import { useEffect, useState } from "react";
import { Check, ClipboardCheck, RotateCcw, Send, UserPlus } from "lucide-react";
import { useParams } from "react-router-dom";
import { PriorityBadge, StatusBadge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { ApiResponse, Category, SupportUnit, Ticket, TicketPriority, TicketStatus } from "../types";

const statuses: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED", "CANCELLED"];
const priorities: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [supportUnits, setSupportUnits] = useState<SupportUnit[]>([]);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [editForm, setEditForm] = useState({ title: "", description: "", location: "", categoryId: "" });
  const canManage = user?.role === "IT_STAFF" || user?.role === "ADMIN";
  const canEmployeeEdit = user?.role === "EMPLOYEE" && !["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket?.status ?? "CLOSED");

  async function load() {
    const res = await api.get<ApiResponse<Ticket>>(`/tickets/${id}`);
    setTicket(res.data.data);
    setEditForm({
      title: res.data.data.title,
      description: res.data.data.description,
      location: res.data.data.location ?? "",
      categoryId: res.data.data.category?.id ?? ""
    });
  }

  useEffect(() => {
    load();
    api.get<ApiResponse<Category[]>>("/categories").then((res) => setCategories(res.data.data));
    api.get<ApiResponse<SupportUnit[]>>("/support-units").then((res) => setSupportUnits(res.data.data));
  }, [id]);

  async function mutate(path: string, payload?: unknown) {
    await api.patch(`/tickets/${id}/${path}`, payload ?? {});
    await load();
  }

  async function sendMessage() {
    if (!message.trim()) return;
    await api.post(`/tickets/${id}/messages`, { message });
    setMessage("");
    await load();
  }

  async function addNote() {
    if (!note.trim()) return;
    await api.post(`/tickets/${id}/internal-notes`, { note });
    setNote("");
    await load();
  }

  async function closeTicket() {
    await api.post(`/tickets/${id}/close`);
    await load();
  }

  async function saveEmployeeEdit(event: React.FormEvent) {
    event.preventDefault();
    await api.patch(`/tickets/${id}`, {
      title: editForm.title,
      description: editForm.description,
      location: editForm.location || null,
      categoryId: editForm.categoryId
    });
    await load();
  }

  async function reopenTicket() {
    await api.post(`/tickets/${id}/reopen`);
    await load();
  }

  if (!ticket) return <div className="text-slate-600">Yukleniyor...</div>;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-700">{ticket.ticketNumber}</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">{ticket.title}</h1>
              <p className="mt-3 text-slate-600">{ticket.description}</p>
            </div>
            <div className="flex gap-2"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
          </div>
          <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2">
            <Info label="Kategori" value={ticket.category?.name} />
            <Info label="Destek ekibi" value={ticket.supportUnit?.name} />
            <Info label="Acan kullanici" value={ticket.createdBy?.name} />
            <Info label="Departman" value={ticket.department?.name} />
            <Info label="Atanan IT personeli" value={ticket.assignedTo?.name ?? "Atanmadi"} />
            <Info label="Konum" value={ticket.location ?? "-"} />
          </dl>
        </Card>

        {canManage && (
          <Card>
            <h2 className="text-lg font-bold text-slate-950">Ticket aksiyonlari</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ActionSelect label="Durum" value={ticket.status} options={statuses} onChange={(status) => mutate("status", { status })} />
              <ActionSelect label="Oncelik" value={ticket.priority} options={priorities} onChange={(priority) => mutate("priority", { priority })} />
              <ActionSelect label="Kategori" value={ticket.category?.id ?? ""} options={categories.map((item) => ({ value: item.id, label: item.name }))} onChange={(categoryId) => mutate("category", { categoryId })} />
              <ActionSelect label="Transfer" value={ticket.supportUnit?.id ?? ""} options={supportUnits.map((item) => ({ value: item.id, label: item.name }))} onChange={(supportUnitId) => mutate("transfer", { supportUnitId, reason: "UI transfer" })} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => mutate("assign")} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"><UserPlus size={16} /> Uzerime al</button>
              <button onClick={() => api.post(`/tickets/${id}/resolve`).then(load)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><Check size={16} /> Cozuldu</button>
              <button onClick={reopenTicket} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><RotateCcw size={16} /> Yeniden ac</button>
            </div>
          </Card>
        )}

        {canEmployeeEdit && (
          <Card>
            <h2 className="text-lg font-bold text-slate-950">Talebi duzenle</h2>
            <form onSubmit={saveEmployeeEdit} className="mt-4 grid gap-3">
              <input value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Baslik" />
              <textarea value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} rows={4} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Aciklama" />
              <div className="grid gap-3 md:grid-cols-2">
                <select value={editForm.categoryId} onChange={(event) => setEditForm((current) => ({ ...current, categoryId: event.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <input value={editForm.location} onChange={(event) => setEditForm((current) => ({ ...current, location: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Konum" />
              </div>
              <button className="w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Degisiklikleri kaydet</button>
            </form>
          </Card>
        )}

        <Card>
          <h2 className="text-lg font-bold text-slate-950">Mesajlar</h2>
          <div className="mt-4 space-y-3">
            {ticket.messages?.length ? ticket.messages.map((item) => (
              <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">{item.sender?.name}</p>
                <p className="mt-1 text-sm text-slate-700">{item.message}</p>
              </div>
            )) : <p className="text-sm text-slate-500">Henuz mesaj yok.</p>}
          </div>
          <div className="mt-4 flex gap-2">
            <input value={message} onChange={(event) => setMessage(event.target.value)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2" placeholder="Yanit yaz..." />
            <button onClick={sendMessage} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white"><Send size={16} /> Gonder</button>
          </div>
          {user?.role === "EMPLOYEE" && ticket.status === "RESOLVED" && (
            <button onClick={closeTicket} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><ClipboardCheck size={16} /> Talebi kapat</button>
          )}
        </Card>

        {canManage && (
          <Card>
            <h2 className="text-lg font-bold text-slate-950">Ic notlar</h2>
            <div className="mt-4 space-y-3">
              {ticket.internalNotes?.length ? ticket.internalNotes.map((item) => (
                <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-700">{item.author?.name}</p>
                  <p className="mt-1 text-sm text-slate-700">{item.note}</p>
                </div>
              )) : <p className="text-sm text-slate-500">Ic not eklenmemis.</p>}
            </div>
            <div className="mt-4 flex gap-2">
              <input value={note} onChange={(event) => setNote(event.target.value)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2" placeholder="Ic not yaz..." />
              <button onClick={addNote} className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white">Ekle</button>
            </div>
          </Card>
        )}
      </div>

      <Card className="h-fit">
        <h2 className="text-lg font-bold text-slate-950">AI Assistant Panel</h2>
        {ticket.aiAnalysis ? (
          <div className="mt-4 space-y-4 text-sm">
            <Info label="Ozet" value={ticket.aiAnalysis.summary} />
            <Info label="Onerilen kategori" value={ticket.aiAnalysis.suggestedCategory} />
            <Info label="Onerilen destek ekibi" value={ticket.aiAnalysis.suggestedSupportUnit} />
            <Info label="Onerilen oncelik" value={ticket.aiAnalysis.suggestedPriority} />
            <Info label="Etki" value={ticket.aiAnalysis.impact} />
            <List title="Muhtemel nedenler" items={ticket.aiAnalysis.possibleCauses} />
            <List title="Cozum adimlari" items={ticket.aiAnalysis.suggestedSolutions} />
            <List title="Istenen ek bilgiler" items={ticket.aiAnalysis.questionsToAsk} />
            <div className="rounded-lg bg-brand-50 p-3 font-semibold text-brand-700">Confidence: {(ticket.aiAnalysis.confidenceScore * 100).toFixed(0)}%</div>
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">AI analizi bulunamadi.</p>}
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div><dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt><dd className="mt-1 text-slate-700">{value ?? "-"}</dd></div>;
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div><p className="font-semibold text-slate-700">{title}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

function ActionSelect({ label, value, options, onChange }: { label: string; value: string; options: (string | { value: string; label: string })[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    </label>
  );
}
