import { AlertTriangle, ArrowRight, Hourglass, Inbox, MessageSquareReply, Plus, Smile, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { BarList, TrendChart } from "../components/charts";
import { PriorityBadge, StatusBadge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState, ErrorState, PageLoader } from "../components/ui/States";
import { useAuth } from "../contexts/AuthContext";
import { useFetch } from "../hooks/useFetch";
import { formatHours, priorityLabels, statusLabels, timeAgo } from "../lib/format";
import { cn } from "../lib/utils";
import { DashboardData, TicketStatus } from "../types";

const descriptions = {
  EMPLOYEE: "Açtığınız taleplerin güncel durumu.",
  IT_STAFF: "Ekibinizin talep yükü ve sizi bekleyen işler.",
  ADMIN: "Tüm destek ekiplerinin talep yükü ve hizmet kalitesi."
};

// The order a ticket moves through. Cancelled tickets leave the flow and are reported separately.
const flow: { status: TicketStatus; bar: string; dot: string }[] = [
  { status: "OPEN", bar: "bg-signal-400", dot: "bg-signal-400" },
  { status: "IN_PROGRESS", bar: "bg-teal-300", dot: "bg-teal-300" },
  { status: "WAITING_USER", bar: "bg-violet-300", dot: "bg-violet-300" },
  { status: "RESOLVED", bar: "bg-emerald-400", dot: "bg-emerald-400" },
  { status: "CLOSED", bar: "bg-white/25", dot: "bg-white/40" }
];

const statusEdge: Record<TicketStatus, string> = {
  OPEN: "bg-signal-400",
  IN_PROGRESS: "bg-teal-500",
  WAITING_USER: "bg-violet-400",
  RESOLVED: "bg-emerald-500",
  CLOSED: "bg-slate-300",
  CANCELLED: "bg-rose-300"
};

function QueuePanel({ data, aside }: { data: DashboardData; aside: React.ReactNode }) {
  const count = (status: TicketStatus) => data.byStatus.find((row) => row.status === status)?.count ?? 0;
  const stages = flow.map((stage) => ({ ...stage, count: count(stage.status) }));
  const inFlow = stages.reduce((sum, stage) => sum + stage.count, 0);
  const cancelled = count("CANCELLED");

  return (
    <section className="overflow-hidden rounded-2xl bg-ink-900 text-white shadow-soft" aria-labelledby="queue-title">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="p-5 sm:p-7">
          <h2 id="queue-title" className="text-lg font-bold">Talep akışı</h2>
          <p className="mt-0.5 text-sm text-brand-100/70">
            {inFlow === 0 ? "Henüz talep yok." : `${inFlow} talebin şu anki durumu, açılıştan kapanışa.`}
            {cancelled > 0 && ` ${cancelled} talep iptal edildi.`}
          </p>

          <div className="mt-6 flex h-3 gap-1 overflow-hidden rounded-full bg-white/10" role="img" aria-label={stages.map((stage) => `${statusLabels[stage.status]}: ${stage.count}`).join(", ")}>
            {stages.filter((stage) => stage.count > 0).map((stage) => (
              <div key={stage.status} className={cn("h-full min-w-[0.5rem] rounded-full", stage.bar)} style={{ flexGrow: stage.count, flexBasis: 0 }} />
            ))}
          </div>

          <ol className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-5">
            {stages.map((stage) => (
              <li key={stage.status}>
                <p className={cn("font-display text-4xl font-bold tabular-nums leading-none", stage.count === 0 && "text-white/35")}>{stage.count}</p>
                <p className="mt-2 flex items-start gap-2 text-sm text-brand-100/80">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", stage.dot)} aria-hidden="true" />
                  {statusLabels[stage.status]}
                </p>
              </li>
            ))}
          </ol>
        </div>
        <div className="grid content-center gap-3 border-t border-white/10 bg-ink-950/60 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-1 lg:border-l lg:border-t-0">{aside}</div>
      </div>
    </section>
  );
}

function Attention({ to, icon: Icon, value, label, urgent = false }: { to: string; icon: typeof Inbox; value: number; label: string; urgent?: boolean }) {
  const active = value > 0;
  return (
    <Link to={to} className={cn("group flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors", active && urgent ? "border-signal-400/60 bg-signal-400/10 hover:bg-signal-400/20" : "border-white/10 hover:bg-white/5")}>
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", active && urgent ? "bg-signal-400 text-ink-950" : "bg-white/10 text-brand-100")}><Icon size={19} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-2xl font-bold tabular-nums leading-none">{value}</span>
        <span className="mt-1 block text-sm text-brand-100/80">{label}</span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-brand-100/50 group-hover:text-white" aria-hidden="true" />
    </Link>
  );
}

function SatisfactionMeter({ average }: { average: number | null }) {
  return (
    <div className="mt-2 flex gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((step) => {
        const fill = average === null ? 0 : Math.max(0, Math.min(1, average - (step - 1)));
        return (
          <span key={step} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <span className="block h-full rounded-full bg-brand-600" style={{ width: `${fill * 100}%` }} />
          </span>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const { user, basePath } = useAuth();
  const { data, loading, error, reload } = useFetch<DashboardData>("/dashboard");

  if (loading && !data) return <PageLoader />;
  if (error || !data || !user) return <ErrorState message={error ?? "Veriler yüklenemedi."} onRetry={reload} />;

  const isEmployee = user.role === "EMPLOYEE";
  const tickets = `${basePath}/tickets`;
  const satisfaction = data.satisfaction.average === null ? "-" : data.satisfaction.average.toLocaleString("tr-TR");
  const today = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  const aside = isEmployee ? (
    <>
      <Attention to={tickets} icon={MessageSquareReply} value={data.waitingUser} label="Yanıtınızı bekliyor" urgent />
      <Link to="/employee/tickets/new" className="flex items-center justify-center gap-2 rounded-xl bg-signal-400 px-4 py-3 text-sm font-bold text-ink-950 hover:bg-signal-300">
        <Plus size={18} /> Yeni talep aç
      </Link>
    </>
  ) : (
    <>
      <Attention to={tickets} icon={AlertTriangle} value={data.urgent} label="Acil ve açık" urgent />
      {user.role === "IT_STAFF" ? (
        <Attention to="/it/tickets/assigned" icon={UserCheck} value={data.assignedToMe} label="Üzerimde" />
      ) : null}
      <Attention to={tickets} icon={Inbox} value={data.unassigned} label="Atanmayı bekliyor" urgent={user.role === "ADMIN"} />
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">Merhaba, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-slate-600">{descriptions[user.role]}</p>
        </div>
        <p className="text-sm font-medium text-slate-500 first-letter:uppercase">{today}</p>
      </div>

      <QueuePanel data={data} aside={aside} />

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <h2 className="text-lg font-bold text-slate-950">Son 14 gün</h2>
          <p className="text-sm text-slate-500">Günlük açılan ve çözülen talep sayısı.</p>
          <div className="mt-4"><TrendChart data={data.trend} /></div>
        </Card>

        <Card className="flex flex-col">
          <h2 className="text-lg font-bold text-slate-950">Hizmet kalitesi</h2>
          <dl className="mt-4 flex flex-1 flex-col justify-between gap-6">
            <div>
              <dt className="flex items-center gap-2 text-sm text-slate-500"><Hourglass size={16} /> Ortalama çözüm süresi</dt>
              <dd className="mt-1 font-display text-3xl font-bold tabular-nums text-slate-950">{formatHours(data.avgResolutionHours)}</dd>
              <p className="mt-1 text-xs text-slate-500">Son 90 günde çözülen talepler</p>
            </div>
            <div className="border-t border-slate-100 pt-5">
              <dt className="flex items-center gap-2 text-sm text-slate-500"><Smile size={16} /> Memnuniyet</dt>
              <dd className="mt-1 font-display text-3xl font-bold tabular-nums text-slate-950">
                {satisfaction}
                {data.satisfaction.average !== null && <span className="text-lg font-semibold text-slate-400"> / 5</span>}
              </dd>
              <SatisfactionMeter average={data.satisfaction.average} />
              <p className="mt-2 text-xs text-slate-500">{data.satisfaction.count ? `${data.satisfaction.count} değerlendirme` : "Henüz değerlendirme yok"}</p>
            </div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="min-w-0 p-0 xl:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-lg font-bold text-slate-950">Son hareketler</h2>
            <Link to={tickets} className="text-sm font-semibold text-brand-600 hover:text-brand-700">Tümünü gör</Link>
          </div>
          {data.recent.length === 0 ? (
            <EmptyState title="Henüz talep yok" description={isEmployee ? "Bir sorun yaşadığınızda buradan talep açabilirsiniz." : "Yeni talepler burada görünecek."} />
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 pb-2">
              {data.recent.map((ticket) => (
                <li key={ticket.id}>
                  <Link to={`${tickets}/${ticket.id}`} className="relative flex flex-col gap-2 py-3 pl-6 pr-5 hover:bg-paper sm:flex-row sm:items-center sm:justify-between">
                    <span className={cn("absolute inset-y-3 left-0 w-1 rounded-r-full", statusEdge[ticket.status])} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{ticket.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        <span className="font-semibold tabular-nums text-brand-700">{ticket.ticketNumber}</span>
                        <span className="mx-1.5 text-slate-300">/</span>
                        {ticket.category?.name}
                        <span className="mx-1.5 text-slate-300">/</span>
                        {timeAgo(ticket.updatedAt)}
                        {!isEmployee && ticket.assignedTo ? <><span className="mx-1.5 text-slate-300">/</span>{ticket.assignedTo.name}</> : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-lg font-bold text-slate-950">{isEmployee ? "Durumlara göre taleplerim" : "Açık talepler, önceliğe göre"}</h2>
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
