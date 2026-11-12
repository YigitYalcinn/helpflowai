import { Card } from "../../components/ui/Card";
import { formatDateTime, statusLabels } from "../../lib/format";
import { Ticket } from "../../types";

type Entry = { id: string; at: string; text: string; detail?: string | null; by?: string };

function buildEntries(ticket: Ticket): Entry[] {
  const statusEntries: Entry[] = (ticket.statusHistory ?? []).map((item) => ({
    id: `s-${item.id}`,
    at: item.createdAt,
    by: item.changedBy?.name,
    text: item.oldStatus ? `Durum: ${statusLabels[item.oldStatus]} → ${statusLabels[item.newStatus]}` : "Talep oluşturuldu"
  }));

  const assignmentEntries: Entry[] = (ticket.assignmentHistory ?? []).map((item) => {
    const moved = item.fromSupportUnit?.id !== item.toSupportUnit?.id;
    const text = moved
      ? `${item.fromSupportUnit?.name ?? "Bir ekip"} → ${item.toSupportUnit?.name ?? "başka ekip"} transferi`
      : item.toAssignedToName
        ? `${item.toAssignedToName} kişisine atandı`
        : "Atama kaldırıldı";
    return { id: `a-${item.id}`, at: item.createdAt, by: item.changedBy?.name, text, detail: moved ? item.reason : null };
  });

  return [...statusEntries, ...assignmentEntries].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function Timeline({ ticket }: { ticket: Ticket }) {
  const entries = buildEntries(ticket);
  if (!entries.length) return null;

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-950">Geçmiş</h2>
      <ol className="mt-4 space-y-4 border-l-2 border-slate-100 pl-4">
        {entries.map((entry) => (
          <li key={entry.id} className="relative">
            <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" aria-hidden />
            <p className="text-sm font-medium text-slate-800">{entry.text}</p>
            {entry.detail && <p className="text-sm text-slate-600">Neden: {entry.detail}</p>}
            <p className="text-xs text-slate-500">{entry.by ? `${entry.by} · ` : ""}{formatDateTime(entry.at)}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
