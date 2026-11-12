import { ArrowLeft, Ban, ClipboardCheck, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PriorityBadge, StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ErrorState, PageLoader } from "../components/ui/States";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../contexts/AuthContext";
import { useAction } from "../hooks/useAction";
import { useFetch } from "../hooks/useFetch";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { Category, Ticket } from "../types";
import { AiPanel } from "./ticket/AiPanel";
import { Attachments } from "./ticket/Attachments";
import { Conversation } from "./ticket/Conversation";
import { InternalNotes } from "./ticket/InternalNotes";
import { RatingCard } from "./ticket/RatingCard";
import { TicketActions } from "./ticket/TicketActions";
import { Timeline } from "./ticket/Timeline";

export function TicketDetailPage() {
  const { id } = useParams();
  const { user, basePath } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: ticket, loading, error, status, reload } = useFetch<Ticket>(`/tickets/${id}`);
  const [draft, setDraft] = useState("");
  const replyAnchor = useRef<HTMLDivElement>(null);

  const listPath = `${basePath}/tickets`;
  const isStaff = user?.role !== "EMPLOYEE";

  // A ticket that was readable and now answers 404 has left this user's scope
  // (transferred to another team or deleted); go back to the list.
  useEffect(() => {
    if (ticket && status === 404) {
      toast.info("Talep artık görüntüleme kapsamınızda değil.");
      navigate(listPath, { replace: true });
    }
  }, [listPath, navigate, status, ticket, toast]);

  if (loading && !ticket) return <PageLoader />;
  if (!ticket) {
    return (
      <div className="space-y-4">
        <ErrorState message={status === 404 ? "Talep bulunamadı veya görüntüleme yetkiniz yok." : error ?? "Talep yüklenemedi."} onRetry={status === 404 ? undefined : reload} />
        <Link to={listPath} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600"><ArrowLeft size={16} /> Taleplere dön</Link>
      </div>
    );
  }

  const canEdit = user?.role === "EMPLOYEE" && !["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.status);

  return (
    <div className="space-y-5">
      <Link to={listPath} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-700"><ArrowLeft size={16} /> Taleplere dön</Link>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-700">{ticket.ticketNumber}</p>
                <h1 className="mt-1 break-words text-2xl font-bold text-slate-950">{ticket.title}</h1>
              </div>
              <div className="flex shrink-0 gap-2"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-slate-700">{ticket.description}</p>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Kategori" value={ticket.category?.name} />
              <Info label="Destek ekibi" value={ticket.supportUnit?.name} />
              <Info label="Atanan personel" value={ticket.assignedTo?.name ?? "Atanmadı"} />
              <Info label="Talebi açan" value={ticket.createdBy?.name} />
              <Info label="Departman" value={ticket.department?.name} />
              <Info label="Konum" value={ticket.location} />
              <Info label="Açılış" value={formatDateTime(ticket.createdAt)} />
              {ticket.resolvedAt && <Info label="Çözüm" value={formatDateTime(ticket.resolvedAt)} />}
              {ticket.closedAt && <Info label="Kapanış" value={formatDateTime(ticket.closedAt)} />}
            </dl>
            {!isStaff && <RequesterActions ticket={ticket} reload={reload} />}
          </Card>

          {isStaff && <TicketActions ticket={ticket} reload={reload} />}
          <div ref={replyAnchor}><Conversation ticket={ticket} reload={reload} draft={draft} setDraft={setDraft} /></div>
          {isStaff && <InternalNotes ticket={ticket} reload={reload} />}
          <Attachments ticket={ticket} reload={reload} />
          {canEdit && <EditCard key={ticket.updatedAt} ticket={ticket} reload={reload} />}
        </div>

        <div className="min-w-0 space-y-5">
          <RatingCard key={`${ticket.status}-${ticket.satisfactionRating?.score ?? 0}`} ticket={ticket} reload={reload} />
          <AiPanel
            ticket={ticket}
            reload={reload}
            onUseAsMessage={(text) => {
              setDraft(text);
              replyAnchor.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
          <Timeline ticket={ticket} />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-slate-700">{value || "-"}</dd>
    </div>
  );
}

/** What the person who opened the ticket can do with it, depending on its state. */
function RequesterActions({ ticket, reload }: { ticket: Ticket; reload: () => Promise<void> }) {
  const { run, busy } = useAction();
  const act = async (key: string, path: string, message: string) => {
    const ok = await run(key, () => api.post(`/tickets/${ticket.id}/${path}`), message);
    if (ok) await reload();
  };

  if (ticket.status === "CANCELLED") return null;

  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      {ticket.status === "RESOLVED" && (
        <>
          <p className="text-sm font-medium text-slate-800">BT ekibi bu talebi çözüldü olarak işaretledi. Sorununuz giderildi mi?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="success" loading={busy === "close"} disabled={busy !== null} onClick={() => act("close", "close", "Talep kapatıldı. Geri bildiriminiz için teşekkürler.")}><ClipboardCheck size={16} /> Evet, talebi kapat</Button>
            <Button variant="secondary" loading={busy === "reopen"} disabled={busy !== null} onClick={() => act("reopen", "reopen", "Talep yeniden açıldı.")}><RotateCcw size={16} /> Hayır, sorun sürüyor</Button>
          </div>
        </>
      )}
      {ticket.status === "CLOSED" && (
        <Button variant="secondary" loading={busy === "reopen"} disabled={busy !== null} onClick={() => act("reopen", "reopen", "Talep yeniden açıldı.")}><RotateCcw size={16} /> Sorun tekrarladı, yeniden aç</Button>
      )}
      {["OPEN", "IN_PROGRESS", "WAITING_USER"].includes(ticket.status) && (
        <Button
          variant="danger"
          loading={busy === "cancel"}
          disabled={busy !== null}
          onClick={() => {
            if (window.confirm("Bu talebi iptal etmek istediğinize emin misiniz? İptal edilen talep yeniden açılamaz.")) act("cancel", "cancel", "Talep iptal edildi.");
          }}
        >
          <Ban size={16} /> Talebi iptal et
        </Button>
      )}
    </div>
  );
}

function EditCard({ ticket, reload }: { ticket: Ticket; reload: () => Promise<void> }) {
  const { run, busy } = useAction();
  const categories = useFetch<Category[]>("/categories");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: ticket.title, description: ticket.description, location: ticket.location ?? "", categoryId: ticket.category?.id ?? "" });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const ok = await run("save", () => api.patch(`/tickets/${ticket.id}`, { ...form, location: form.location.trim() || null }), "Talep güncellendi.");
    if (ok) await reload();
  }

  if (!open) {
    return <Button variant="secondary" onClick={() => setOpen(true)}>Talep bilgilerini düzenle</Button>;
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-950">Talebi düzenle</h2>
      <form onSubmit={save} className="mt-4 grid gap-3">
        <div>
          <label className="label" htmlFor="edit-title">Başlık</label>
          <input id="edit-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="input" required minLength={3} maxLength={160} />
        </div>
        <div>
          <label className="label" htmlFor="edit-description">Açıklama</label>
          <textarea id="edit-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={5} className="input" required minLength={10} maxLength={5000} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="edit-category">Kategori</label>
            <select id="edit-category" value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))} className="input">
              {(categories.data ?? []).filter((category) => category.isActive || category.id === ticket.category?.id).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="edit-location">Konum</label>
            <input id="edit-location" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} className="input" maxLength={160} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" loading={busy === "save"}>Değişiklikleri kaydet</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>Vazgeç</Button>
        </div>
      </form>
    </Card>
  );
}
