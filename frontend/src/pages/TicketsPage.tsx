import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PriorityBadge, StatusBadge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { ApiResponse, Ticket } from "../types";

export function TicketsPage({ assignedOnly = false }: { assignedOnly?: boolean }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.get<ApiResponse<Ticket[]>>("/tickets").then((res) => setTickets(res.data.data));
  }, []);

  const visible = useMemo(() => tickets
    .filter((ticket) => !assignedOnly || ticket.assignedTo?.id === user?.id)
    .filter((ticket) => `${ticket.ticketNumber} ${ticket.title} ${ticket.description}`.toLowerCase().includes(query.toLowerCase())), [assignedOnly, query, tickets, user?.id]);

  const detailPrefix = user?.role === "ADMIN" ? "/admin/tickets" : user?.role === "IT_STAFF" ? "/it/tickets" : "/employee/tickets";

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Ticket Listesi</h1>
          <p className="text-sm text-slate-500">Arama, durum ve öncelik bilgileriyle destek talepleri.</p>
        </div>
        {user?.role === "EMPLOYEE" && <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white" to="/employee/tickets/new">Yeni Talep</Link>}
      </div>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ticket ara..." className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand-500" />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Başlık</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Öncelik</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Destek Ekibi</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((ticket) => (
              <tr key={ticket.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-brand-700"><Link to={`${detailPrefix}/${ticket.id}`}>{ticket.ticketNumber}</Link></td>
                <td className="px-4 py-3 font-medium text-slate-900">{ticket.title}</td>
                <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                <td className="px-4 py-3 text-slate-600">{ticket.category?.name}</td>
                <td className="px-4 py-3 text-slate-600">{ticket.supportUnit?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
