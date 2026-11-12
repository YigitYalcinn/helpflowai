import { ArrowRightLeft, Check, RotateCcw, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useAction } from "../../hooks/useAction";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../lib/api";
import { priorities, priorityLabels, statuses, statusLabels } from "../../lib/format";
import { Category, SupportUnit, Ticket, UserBrief } from "../../types";

const UNASSIGNED = "__unassigned__";

/** Staff controls: status, priority, category, assignee, transfer and delete. */
export function TicketActions({ ticket, reload }: { ticket: Ticket; reload: () => Promise<void> }) {
  const { user, basePath } = useAuth();
  const navigate = useNavigate();
  const { run, busy } = useAction();
  const categories = useFetch<Category[]>("/categories");
  const supportUnits = useFetch<SupportUnit[]>("/support-units");
  // Re-fetch teammates when the ticket moves to another team.
  const assignees = useFetch<UserBrief[]>(`/tickets/${ticket.id}/assignees?unit=${ticket.supportUnit?.id ?? ""}`);
  const [transferTo, setTransferTo] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const locked = ticket.status === "CLOSED" || ticket.status === "CANCELLED";
  const finished = locked || ticket.status === "RESOLVED";
  const mine = ticket.assignedTo?.id === user?.id;
  const path = `/tickets/${ticket.id}`;

  const mutate = (key: string, request: () => Promise<unknown>, message?: string) =>
    run(key, async () => {
      await request();
      await reload();
    }, message);

  async function transfer() {
    const unit = supportUnits.data?.find((item) => item.id === transferTo);
    if (!unit) return;
    const ok = await run("transfer", () => api.patch(`${path}/transfer`, { supportUnitId: unit.id, reason: transferReason.trim() || undefined }), `Talep ${unit.name} ekibine transfer edildi.`);
    if (!ok) return;
    setTransferTo("");
    setTransferReason("");
    // IT staff lose access once the ticket leaves their team; the page handles the redirect.
    await reload();
  }

  async function remove() {
    if (!window.confirm(`${ticket.ticketNumber} numaralı talep, mesajları ve ekleriyle birlikte kalıcı olarak silinsin mi?`)) return;
    const ok = await run("delete", () => api.delete(path), "Talep silindi.");
    if (ok) navigate(`${basePath}/tickets`);
  }

  const otherUnits = (supportUnits.data ?? []).filter((unit) => unit.isActive && unit.id !== ticket.supportUnit?.id);
  const assigneeOptions = [...(assignees.data ?? [])];
  if (ticket.assignedTo && !assigneeOptions.some((item) => item.id === ticket.assignedTo?.id)) assigneeOptions.push(ticket.assignedTo);

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-950">Talep yönetimi</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Select label="Durum" value={ticket.status} disabled={busy !== null} onChange={(status) => mutate("status", () => api.patch(`${path}/status`, { status }), "Durum güncellendi.")}>
          {statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
        </Select>
        <Select label="Öncelik" value={ticket.priority} disabled={busy !== null} onChange={(priority) => mutate("priority", () => api.patch(`${path}/priority`, { priority }), "Öncelik güncellendi.")}>
          {priorities.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}
        </Select>
        <Select label="Kategori" value={ticket.category?.id ?? ""} disabled={busy !== null || locked} onChange={(categoryId) => mutate("category", () => api.patch(`${path}/category`, { categoryId }), "Kategori güncellendi.")}>
          {(categories.data ?? []).filter((category) => category.isActive || category.id === ticket.category?.id).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </Select>
        <Select
          label="Atanan personel"
          value={ticket.assignedTo?.id ?? UNASSIGNED}
          disabled={busy !== null || locked}
          onChange={(value) => mutate("assign", () => api.patch(`${path}/assign`, { assignedToId: value === UNASSIGNED ? null : value }), value === UNASSIGNED ? "Atama kaldırıldı." : "Talep atandı.")}
        >
          <option value={UNASSIGNED}>Atanmadı</option>
          {assigneeOptions.map((item) => <option key={item.id} value={item.id}>{item.name}{item.id === user?.id ? " (ben)" : ""}</option>)}
        </Select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!mine && !locked && user?.role === "IT_STAFF" && (
          <Button variant="dark" loading={busy === "take"} disabled={busy !== null} onClick={() => mutate("take", () => api.patch(`${path}/assign`, {}), "Talep üzerinize alındı.")}><UserPlus size={16} /> Üzerime al</Button>
        )}
        {!finished && (
          <Button variant="success" loading={busy === "resolve"} disabled={busy !== null} onClick={() => mutate("resolve", () => api.post(`${path}/resolve`), "Talep çözüldü olarak işaretlendi.")}><Check size={16} /> Çözüldü</Button>
        )}
        {finished && (
          <Button variant="secondary" loading={busy === "reopen"} disabled={busy !== null} onClick={() => mutate("reopen", () => api.post(`${path}/reopen`), "Talep yeniden açıldı.")}><RotateCcw size={16} /> Yeniden aç</Button>
        )}
        {user?.role === "ADMIN" && (
          <Button variant="danger" loading={busy === "delete"} disabled={busy !== null} onClick={remove}><Trash2 size={16} /> Sil</Button>
        )}
      </div>

      {!locked && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-800">Başka ekibe transfer et</h3>
          <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <select value={transferTo} onChange={(event) => setTransferTo(event.target.value)} className="input" aria-label="Hedef destek ekibi">
              <option value="">Ekip seçin</option>
              {otherUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
            <input value={transferReason} onChange={(event) => setTransferReason(event.target.value)} maxLength={500} placeholder="Transfer nedeni (isteğe bağlı)" className="input" />
            <Button variant="secondary" loading={busy === "transfer"} disabled={!transferTo || busy !== null} onClick={transfer}><ArrowRightLeft size={16} /> Transfer et</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Select({ label, value, onChange, disabled, children }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="input mt-1">
        {children}
      </select>
    </label>
  );
}
