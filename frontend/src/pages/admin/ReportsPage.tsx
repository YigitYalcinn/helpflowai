import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { ApiResponse } from "../../types";

type ReportKind = "tickets-by-priority" | "tickets-by-category" | "tickets-by-support-unit" | "tickets-by-department";
type ReportRow = { label: string; count: number };

const reportOptions: { value: ReportKind; label: string }[] = [
  { value: "tickets-by-priority", label: "Oncelige gore" },
  { value: "tickets-by-category", label: "Kategoriye gore" },
  { value: "tickets-by-support-unit", label: "Destek ekibine gore" },
  { value: "tickets-by-department", label: "Departmana gore" }
];

export function ReportsPage() {
  const [kind, setKind] = useState<ReportKind>("tickets-by-priority");
  const [rows, setRows] = useState<ReportRow[]>([]);

  useEffect(() => {
    api.get<ApiResponse<ReportRow[]>>(`/reports/${kind}`).then((res) => setRows(res.data.data));
  }, [kind]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Raporlar</h1>
          <p className="text-sm text-slate-500">Ticket dagilimini kategori, ekip, departman ve oncelige gore izleyin.</p>
        </div>
        <select value={kind} onChange={(event) => setKind(event.target.value as ReportKind)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          {reportOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <Card className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ left: 8, right: 8, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" angle={-32} textAnchor="end" interval={0} height={92} tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
