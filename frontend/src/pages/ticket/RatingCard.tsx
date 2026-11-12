import { Star } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useAction } from "../../hooks/useAction";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { Ticket } from "../../types";

const scoreLabels = ["", "Çok kötü", "Kötü", "Orta", "İyi", "Çok iyi"];

function Stars({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
  return (
    <div className="flex gap-1" role={onChange ? "radiogroup" : "img"} aria-label={onChange ? "Puan" : `5 üzerinden ${value}`}>
      {[1, 2, 3, 4, 5].map((score) => {
        const star = <Star size={24} className={cn(score <= value ? "fill-amber-400 text-amber-400" : "text-slate-300")} aria-hidden />;
        return onChange ? (
          <button key={score} type="button" role="radio" aria-checked={score === value} aria-label={`${score} - ${scoreLabels[score]}`} onClick={() => onChange(score)} className="rounded p-0.5 hover:scale-110">
            {star}
          </button>
        ) : (
          <span key={score}>{star}</span>
        );
      })}
    </div>
  );
}

/** Requesters rate a resolved ticket; staff see the result read-only. */
export function RatingCard({ ticket, reload }: { ticket: Ticket; reload: () => Promise<void> }) {
  const { user } = useAuth();
  const { run, busy } = useAction();
  const existing = ticket.satisfactionRating;
  const [score, setScore] = useState(existing?.score ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [editing, setEditing] = useState(!existing);

  const done = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
  const canRate = done && user?.id === ticket.createdBy?.id;
  if (!canRate && !existing) return null;

  async function save() {
    const ok = await run("rate", () => api.post(`/tickets/${ticket.id}/rating`, { score, comment: comment.trim() || null }), "Değerlendirmeniz için teşekkürler.");
    if (!ok) return;
    setEditing(false);
    await reload();
  }

  if (!canRate || !editing) {
    return (
      <Card>
        <h2 className="text-lg font-bold text-slate-950">Memnuniyet</h2>
        <div className="mt-3 flex items-center gap-3">
          <Stars value={existing?.score ?? 0} />
          <span className="text-sm font-medium text-slate-700">{scoreLabels[existing?.score ?? 0]}</span>
        </div>
        {existing?.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">“{existing.comment}”</p>}
        {canRate && <Button variant="secondary" size="sm" className="mt-3" onClick={() => setEditing(true)}>Değerlendirmeyi değiştir</Button>}
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-950">Destek hizmetini değerlendirin</h2>
      <p className="text-sm text-slate-500">Geri bildiriminiz BT ekibinin hizmet kalitesini ölçmesine yardımcı olur.</p>
      <div className="mt-3 flex items-center gap-3">
        <Stars value={score} onChange={setScore} />
        <span className="text-sm font-medium text-slate-700">{scoreLabels[score]}</span>
      </div>
      <label className="sr-only" htmlFor="rating-comment">Yorum</label>
      <textarea id="rating-comment" value={comment} onChange={(event) => setComment(event.target.value)} rows={2} maxLength={1000} className="input mt-3" placeholder="Eklemek istediğiniz bir yorum var mı? (isteğe bağlı)" />
      <div className="mt-3 flex gap-2">
        <Button loading={busy === "rate"} disabled={score === 0} onClick={save}>Gönder</Button>
        {existing && <Button variant="ghost" onClick={() => setEditing(false)}>Vazgeç</Button>}
      </div>
    </Card>
  );
}
