import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAction } from "../../hooks/useAction";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { Ticket } from "../../types";

export function InternalNotes({ ticket, reload }: { ticket: Ticket; reload: () => Promise<void> }) {
  const { run, busy } = useAction();
  const [note, setNote] = useState("");
  const notes = ticket.internalNotes ?? [];

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!note.trim()) return;
    const ok = await run("note", () => api.post(`/tickets/${ticket.id}/internal-notes`, { note: note.trim() }));
    if (!ok) return;
    setNote("");
    await reload();
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-950">İç notlar</h2>
      <p className="text-sm text-slate-500">Yalnızca BT ekibi görür; talebi açan kişiye gösterilmez.</p>
      <div className="mt-4 space-y-3">
        {notes.length === 0 && <p className="text-sm text-slate-500">İç not eklenmemiş.</p>}
        {notes.map((item) => (
          <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800">{item.author?.name} <span className="font-normal text-amber-700">· {formatDateTime(item.createdAt)}</span></p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{item.note}</p>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="internal-note">İç not</label>
        <input id="internal-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={4000} className="input flex-1" placeholder="İç not yazın..." />
        <Button type="submit" variant="secondary" loading={busy === "note"} disabled={!note.trim()}>Ekle</Button>
      </form>
    </Card>
  );
}
