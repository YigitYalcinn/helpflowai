import { Download, MessageSquare, Paperclip, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PriorityBadge, StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, PageHeader } from "../components/ui/Card";
import { EmptyState, ErrorState, PageLoader } from "../components/ui/States";
import { useAuth } from "../contexts/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { activeStatuses, downloadBlob, formatDateTime, matchesQuery, priorities, priorityLabels, statuses, statusLabels, timeAgo, toCsv } from "../lib/format";
import { Ticket, TicketPriority, TicketStatus } from "../types";

type StatusFilter = "ACTIVE" | "ALL" | TicketStatus;
type Sort = "newest" | "oldest" | "priority";

const priorityRank: Record<TicketPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function TicketsPage({ assignedOnly = false }: { assignedOnly?: boolean }) {
  const { user, basePath } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch<Ticket[]>("/tickets");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ACTIVE");
  const [priority, setPriority] = useState<"ALL" | TicketPriority>("ALL");
  const [category, setCategory] = useState("ALL");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");

  const isEmployee = user?.role === "EMPLOYEE";
  const categoryNames = useMemo(() => [...new Set((data ?? []).map((ticket) => ticket.category?.name).filter((name): name is string => Boolean(name)))].sort((a, b) => a.localeCompare(b, "tr")), [data]);
  const tickets = useMemo(() => (data ?? []).filter((ticket) => !assignedOnly || ticket.assignedTo?.id === user?.id), [assignedOnly, data, user?.id]);

  const visible = useMemo(() => {
    const rows = tickets
      .filter((ticket) => status === "ALL" || (status === "ACTIVE" ? activeStatuses.includes(ticket.status) : ticket.status === status))
      .filter((ticket) => priority === "ALL" || ticket.priority === priority)
      .filter((ticket) => category === "ALL" || ticket.category?.name === category)
      .filter((ticket) => !unassignedOnly || !ticket.assignedTo)
      .filter((ticket) => !query.trim() || matchesQuery(`${ticket.ticketNumber} ${ticket.title} ${ticket.description} ${ticket.createdBy?.name ?? ""} ${ticket.category?.name ?? ""}`, query));

    const byDate = (a: Ticket, b: Ticket) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "oldest") return rows.sort((a, b) => byDate(b, a));
    if (sort === "priority") return rows.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || byDate(a, b));
    return rows.sort(byDate);
  }, [category, priority, query, sort, status, tickets, unassignedOnly]);

  function exportCsv() {
    const rows = visible.map((ticket) => [
      ticket.ticketNumber,
      ticket.title,
      statusLabels[ticket.status],
      priorityLabels[ticket.priority],
      ticket.category?.name,
      ticket.supportUnit?.name,
      ticket.createdBy?.name,
      ticket.department?.name,
      ticket.assignedTo?.name,
      formatDateTime(ticket.createdAt),
      ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : "",
      ticket.satisfactionRating?.score
    ]);
    const header = ["No", "Başlık", "Durum", "Öncelik", "Kategori", "Destek ekibi", "Açan", "Departman", "Atanan", "Açılış", "Çözüm", "Memnuniyet"];
    downloadBlob(new Blob([toCsv([header, ...rows])], { type: "text/csv;charset=utf-8" }), `helpflow-talepler-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  if (loading && !data) return <PageLoader />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  const filtered = status !== "ACTIVE" || priority !== "ALL" || category !== "ALL" || unassignedOnly || Boolean(query.trim());

  return (
    <div className="space-y-5">
      <PageHeader
        title={assignedOnly ? "Üzerimdeki Talepler" : isEmployee ? "Taleplerim" : "Talepler"}
        description={`${visible.length} talep gösteriliyor${tickets.length !== visible.length ? ` (toplam ${tickets.length})` : ""}.`}
        actions={
          <>
            {!isEmployee && <Button variant="secondary" onClick={exportCsv} disabled={!visible.length}><Download size={16} /> CSV indir</Button>}
            {isEmployee && <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to="/employee/tickets/new">Yeni Talep</Link>}
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative block">
          <span className="sr-only">Talep ara</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Numara, başlık veya kişi ara..." className="input pl-9" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="input md:w-52" aria-label="Durum filtresi">
          <option value="ACTIVE">Devam edenler</option>
          <option value="ALL">Tüm durumlar</option>
          {statuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
        </select>
        <select value={priority} onChange={(event) => setPriority(event.target.value as "ALL" | TicketPriority)} className="input md:w-40" aria-label="Öncelik filtresi">
          <option value="ALL">Tüm öncelikler</option>
          {priorities.map((item) => <option key={item} value={item}>{priorityLabels[item]}</option>)}
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="input md:w-48" aria-label="Kategori filtresi">
          <option value="ALL">Tüm kategoriler</option>
          {categoryNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="input md:w-44" aria-label="Sıralama">
          <option value="newest">En yeni önce</option>
          <option value="oldest">En eski önce</option>
          <option value="priority">Önceliğe göre</option>
        </select>
      </div>
      {!isEmployee && !assignedOnly && (
        <label className="flex w-fit items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={unassignedOnly} onChange={(event) => setUnassignedOnly(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Yalnızca atanmamış talepler
        </label>
      )}

      <Card className="overflow-x-auto p-0">
        {visible.length === 0 ? (
          <EmptyState
            title={filtered ? "Bu filtrelere uyan talep yok" : "Devam eden talep yok"}
            description={filtered ? "Filtreleri değiştirerek tekrar deneyin." : "Geçmiş talepleri görmek için durum filtresini değiştirin."}
            action={<Button variant="secondary" onClick={() => { setQuery(""); setStatus("ALL"); setPriority("ALL"); setCategory("ALL"); setUnassignedOnly(false); }}>Tüm talepleri göster</Button>}
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Talep</th>
                <th className="px-4 py-3 font-semibold">Durum</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Öncelik</th>
                <th className="hidden px-4 py-3 font-semibold lg:table-cell">Kategori</th>
                {!isEmployee && <th className="hidden px-4 py-3 font-semibold xl:table-cell">Açan</th>}
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Atanan</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Açılış</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((ticket) => (
                <tr key={ticket.id} onClick={() => navigate(`${basePath}/tickets/${ticket.id}`)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="max-w-[18rem] px-4 py-3 lg:max-w-md">
                    <Link to={`${basePath}/tickets/${ticket.id}`} onClick={(event) => event.stopPropagation()} className="block">
                      <span className="text-xs font-semibold text-brand-700">{ticket.ticketNumber}</span>
                      <span className="block truncate font-medium text-slate-900">{ticket.title}</span>
                    </Link>
                    <span className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      {Boolean(ticket._count?.messages) && <span className="inline-flex items-center gap-1"><MessageSquare size={12} /> {ticket._count?.messages}</span>}
                      {Boolean(ticket._count?.attachments) && <span className="inline-flex items-center gap-1"><Paperclip size={12} /> {ticket._count?.attachments}</span>}
                      <span className="sm:hidden"><PriorityBadge priority={ticket.priority} /></span>
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                  <td className="hidden px-4 py-3 sm:table-cell"><PriorityBadge priority={ticket.priority} /></td>
                  <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{ticket.category?.name}</td>
                  {!isEmployee && <td className="hidden px-4 py-3 text-slate-600 xl:table-cell">{ticket.createdBy?.name}</td>}
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{ticket.assignedTo?.name ?? <span className="text-slate-400">Atanmadı</span>}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 md:table-cell" title={formatDateTime(ticket.createdAt)}>{timeAgo(ticket.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
