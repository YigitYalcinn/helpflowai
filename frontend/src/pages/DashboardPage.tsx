import { Activity, AlertTriangle, CheckCircle2, Clock, Hourglass, Inbox, Smile, Ticket as TicketIcon, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { BarList, TrendChart } from "../components/charts";
import { PriorityBadge, StatusBadge } from "../components/ui/Badge";
import { Card, PageHeader, StatCard } from "../components/ui/Card";
import { EmptyState, ErrorState, PageLoader } from "../components/ui/States";
import { useAuth } from "../contexts/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { formatHours, priorityLabels, statusLabels, timeAgo } from "../lib/format";
import { DashboardData } from "../types";

const descriptions = {
  EMPLOYEE: "Açtığınız taleplerin güncel durumu.",
  IT_STAFF: "Ekibinizin talep yükü ve sizi bekleyen işler.",
  ADMIN: "Tüm destek ekiplerinin talep yükü ve hizmet kalitesi."
};

export function DashboardPage() {
  const { user, basePath } = useAuth();
  const { data, loading, error, reload } = useFetch<DashboardData>("/dashboard");

  if (loading && !data) return <PageLoader />;
  if (error || !data || !user) return <ErrorState message={error ?? "Veriler yüklenemedi."} onRetry={reload} />;

  const isEmployee = user.role === "EMPLOYEE";
  const satisfaction = data.satisfaction.average === null ? "-" : `${data.satisfaction.average.toLocaleString("tr-TR")} / 5`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Merhaba, ${user.name.split(" ")[0]}`}
        description={descriptions[user.role]}
        actions={isEmployee && <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to="/employee/tickets/new">Yeni Talep</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Açık" value={data.open} hint="Henüz ele alınmadı" icon={Clock} />
        <StatCard label="İşlemde" value={data.inProgress} hint={data.waitingUser ? `${data.waitingUser} talep ${isEmployee ? "yanıtınızı" : "kullanıcı yanıtı"} bekliyor` : "Üzerinde çalışılıyor"} icon={Activity} />
        {isEmployee ? (
          <StatCard label="Çözülen" value={data.resolved + data.closed} hint="Çözüldü veya kapatıldı" icon={CheckCircle2} />
        ) : (
          <StatCard label="Acil" value={data.urgent} hint="Açık ve acil öncelikli" icon={AlertTriangle} />
        )}
        {isEmployee ? (
          <StatCard label="Toplam Talep" value={data.total} icon={TicketIcon} />
        ) : user.role === "IT_STAFF" ? (
          <StatCard label="Üzerimde" value={data.assignedToMe} hint={`${data.unassigned} talep atanmayı bekliyor`} icon={UserCheck} />
        ) : (
          <StatCard label="Atanmamış" value={data.unassigned} hint="Sahibi olmayan açık talepler" icon={Inbox} />
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="text-base font-bold text-slate-950">Son 14 gün</h2>
          <p className="text-sm text-slate-500">Günlük açılan ve çözülen talep sayısı.</p>
          <div className="mt-4"><TrendChart data={data.trend} /></div>
        </Card>
        <div className="grid gap-4">
          <StatCard label="Ortalama çözüm süresi" value={formatHours(data.avgResolutionHours)} hint="Son 90 günde çözülen talepler" icon={Hourglass} />
          <StatCard label="Memnuniyet" value={satisfaction} hint={data.satisfaction.count ? `${data.satisfaction.count} değerlendirme` : "Henüz değerlendirme yok"} icon={Smile} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-0 xl:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-base font-bold text-slate-950">Son hareketler</h2>
            <Link to={`${basePath}/tickets`} className="text-sm font-semibold text-brand-600 hover:text-brand-700">Tümünü gör</Link>
          </div>
          {data.recent.length === 0 ? (
            <EmptyState title="Henüz talep yok" description={isEmployee ? "Bir sorun yaşadığınızda buradan talep açabilirsiniz." : "Yeni talepler burada görünecek."} />
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {data.recent.map((ticket) => (
                <li key={ticket.id}>
                  <Link to={`${basePath}/tickets/${ticket.id}`} className="flex flex-col gap-2 px-5 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900"><span className="text-brand-700">{ticket.ticketNumber}</span> · {ticket.title}</p>
                      <p className="truncate text-xs text-slate-500">{ticket.category?.name} · {timeAgo(ticket.updatedAt)}{!isEmployee && ticket.assignedTo ? ` · ${ticket.assignedTo.name}` : ""}</p>
                    </div>
                    <div className="flex shrink-0 gap-2"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-base font-bold text-slate-950">{isEmployee ? "Durumlara göre taleplerim" : "Açık talepler, önceliğe göre"}</h2>
          <div className="mt-4">
            {isEmployee ? (
              <BarList rows={data.byStatus.map((row) => ({ label: statusLabels[row.status], count: row.count }))} emptyText="Henüz talep yok." />
            ) : (
              <BarList rows={[...data.openByPriority].reverse().map((row) => ({ label: priorityLabels[row.priority], count: row.count }))} emptyText="Açık talep yok." />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
