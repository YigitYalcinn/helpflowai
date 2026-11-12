import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDayKey } from "../lib/format";
import { ReportRow, TrendPoint } from "../types";

// Two categorical hues, checked for colour-blind separation and contrast on white.
const CREATED = "#1d4ed8";
const RESOLVED = "#d97706";

export function TrendChart({ data, height = 260 }: { data: TrendPoint[]; height?: number }) {
  const hasData = data.some((point) => point.created > 0 || point.resolved > 0);
  if (!hasData) return <p className="grid place-items-center text-sm text-slate-500" style={{ height }}>Bu dönemde talep hareketi yok.</p>;

  return (
    <div style={{ height }} role="img" aria-label="Günlük açılan ve çözülen talep sayıları">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatDayKey} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <Tooltip
            labelFormatter={(label) => formatDayKey(String(label))}
            cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a" }}
            itemStyle={{ color: "#334155" }}
          />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 13, color: "#334155" }} formatter={(value) => <span className="text-slate-700">{value}</span>} />
          <Line type="monotone" dataKey="created" name="Açılan" stroke={CREATED} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
          <Line type="monotone" dataKey="resolved" name="Çözülen" stroke={RESOLVED} strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars for one measure across categories; long Turkish labels stay readable. */
export function BarList({ rows, emptyText = "Veri yok.", limit = 8 }: { rows: ReportRow[]; emptyText?: string; limit?: number }) {
  const visible = rows.filter((row) => row.count > 0).slice(0, limit);
  const hidden = rows.filter((row) => row.count > 0).slice(limit);
  const items = hidden.length ? [...visible, { label: `Diğer (${hidden.length})`, count: hidden.reduce((sum, row) => sum + row.count, 0) }] : visible;
  const max = Math.max(1, ...items.map((row) => row.count));

  if (!items.length) return <p className="py-6 text-center text-sm text-slate-500">{emptyText}</p>;

  return (
    <ul className="space-y-3">
      {items.map((row) => (
        <li key={row.label} title={`${row.label}: ${row.count}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{row.label}</span>
            <span className="font-semibold tabular-nums text-slate-900">{row.count}</span>
          </div>
          <div className="mt-1 h-2 rounded bg-slate-100">
            <div className="h-2 rounded bg-brand-600" style={{ width: `${Math.max(2, (row.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
