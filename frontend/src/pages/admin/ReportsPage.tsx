import { Bot, Hourglass, Smile, Ticket as TicketIcon } from "lucide-react";
import { useState } from "react";
import { BarList, TrendChart } from "../../components/charts";
import { Card, PageHeader, StatCard } from "../../components/ui/Card";
import { ErrorState, PageLoader } from "../../components/ui/States";
import { useAuth } from "../../contexts/AuthContext";
import { useFetch } from "../../hooks/useFetch";
import { formatHours, priorityLabels, statusLabels } from "../../lib/format";
import { ReportOverview, ReportRow, TicketPriority, TicketStatus } from "../../types";

const ranges = [
  { value: "7", label: "Son 7 gün" },
  { value: "30", label: "Son 30 gün" },
  { value: "90", label: "Son 90 gün" },
  { value: "0", label: "Tüm zamanlar" }
];

export function ReportsPage() {
  const { user } = useAuth();
  const [days, setDays] = useState("30");
  const { data, loading, error, reload } = useFetch<ReportOverview>(`/reports/overview${days === "0" ? "" : `?days=${days}`}`);

  const header = (
    <PageHeader
      title="Raporlar"
      description={user?.role === "ADMIN" ? "Seçilen dönemde açılan tüm talepler." : "Seçilen dönemde ekibinize gelen talepler."}
      actions={
        <select value={days} onChange={(event) => setDays(event.target.value)} className="input w-44" aria-label="Dönem">
          {ranges.map((range) => <option key={range.value} value={range.value}>{range.label}</option>)}
        </select>
      }
    />
  );

  if (loading && !data) return <div className="space-y-5">{header}<PageLoader /></div>;
  if (error || !data) return <div className="space-y-5">{header}<ErrorState message={error ?? "Rapor yüklenemedi."} onRetry={reload} /></div>;

  const { kpis } = data;
  const translate = (rows: ReportRow[], labels: Record<string, string>) => rows.map((row) => ({ ...row, label: labels[row.label] ?? row.label }));

  return (
    <div className="space-y-5">
      {header}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Açılan talep" value={kpis.total} icon={TicketIcon} />
        <StatCard label="Ortalama çözüm süresi" value={formatHours(kpis.avgResolutionHours)} hint="Açılıştan çözüme" icon={Hourglass} />
        <StatCard
          label="Memnuniyet"
          value={kpis.satisfaction.average === null ? "-" : `${kpis.satisfaction.average.toLocaleString("tr-TR")} / 5`}
          hint={kpis.satisfaction.count ? `${kpis.satisfaction.count} değerlendirme` : "Henüz değerlendirme yok"}
          icon={Smile}
        />
        <StatCard
          label="AI kategori isabeti"
          value={kpis.aiAccuracy === null ? "-" : `%${kpis.aiAccuracy}`}
          hint={kpis.aiAnalyzed ? `${kpis.aiAnalyzed} analizde öneri = son kategori` : "Analiz edilen talep yok"}
          icon={Bot}
        />
      </div>

      <Card>
        <h2 className="text-base font-bold text-slate-950">Talep akışı</h2>
        <p className="text-sm text-slate-500">Günlük açılan ve çözülen talep sayısı{days === "0" ? " (son 30 gün)" : ""}.</p>
        <div className="mt-4"><TrendChart data={data.trend} height={280} /></div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ReportCard title="Kategoriye göre" rows={data.byCategory} />
        <ReportCard title="Destek ekibine göre" rows={data.bySupportUnit} />
        <ReportCard title="Departmana göre" rows={data.byDepartment} />
        <ReportCard title="Duruma göre" rows={translate(data.byStatus, statusLabels as Record<TicketStatus, string>)} />
        <ReportCard title="Önceliğe göre" rows={translate([...data.byPriority].reverse(), priorityLabels as Record<TicketPriority, string>)} />
        <ReportCard title="Personele göre çözülen" rows={data.byStaff} emptyText="Bu dönemde çözülen atanmış talep yok." />
      </div>
    </div>
  );
}

function ReportCard({ title, rows, emptyText }: { title: string; rows: ReportRow[]; emptyText?: string }) {
  return (
    <Card>
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      <div className="mt-4"><BarList rows={rows} emptyText={emptyText ?? "Bu dönemde talep yok."} /></div>
    </Card>
  );
}
