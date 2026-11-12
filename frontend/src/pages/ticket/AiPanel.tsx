import { FileText, ListChecks, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { PriorityBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useAction } from "../../hooks/useAction";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../lib/api";
import { ApiResponse, Category, Ticket } from "../../types";

type Output = { kind: "summary" | "closing"; text: string };
type Props = { ticket: Ticket; reload: () => Promise<void>; onUseAsMessage: (text: string) => void };

export function AiPanel({ ticket, reload, onUseAsMessage }: Props) {
  const { user } = useAuth();
  const { run, busy } = useAction();
  const [output, setOutput] = useState<Output | null>(null);
  const isStaff = user?.role !== "EMPLOYEE";
  const categories = useFetch<Category[]>(isStaff ? "/categories" : null);
  const analysis = ticket.aiAnalysis;

  async function generate(kind: Output["kind"]) {
    await run(kind, async () => {
      const res = await api.post<ApiResponse<{ summary: string }>>(`/ai/tickets/${ticket.id}/${kind === "summary" ? "summary" : "closing-summary"}`);
      setOutput({ kind, text: res.data.data.summary });
    });
  }

  async function reanalyze() {
    const ok = await run("reanalyze", () => api.post(`/ai/tickets/${ticket.id}/reanalyze`), "AI analizi yenilendi.");
    if (ok) await reload();
  }

  async function saveAsNote(text: string) {
    const ok = await run("save-note", () => api.post(`/tickets/${ticket.id}/internal-notes`, { note: `AI özeti:\n${text}` }), "Özet iç not olarak kaydedildi.");
    if (!ok) return;
    setOutput(null);
    await reload();
  }

  // Employees get the self-help part only; triage details are for the IT team.
  if (!isStaff) {
    if (!analysis?.suggestedSolutions.length) return null;
    return (
      <Card>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Sparkles size={18} className="text-brand-600" /> Beklerken deneyebilecekleriniz</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">{analysis.suggestedSolutions.map((item) => <li key={item}>{item}</li>)}</ul>
        <p className="mt-3 text-xs text-slate-400">Yapay zekâ önerisidir; sorun sürerse BT ekibi talebinizle ilgilenecek.</p>
      </Card>
    );
  }

  const source = analysis?.rawResponse?.source;
  const suggested = analysis && analysis.suggestedCategory !== ticket.category?.name ? categories.data?.find((item) => item.name === analysis.suggestedCategory && item.isActive) : undefined;
  const locked = ticket.status === "CLOSED" || ticket.status === "CANCELLED";

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Sparkles size={18} className="text-brand-600" /> AI Asistan</h2>
        <Button variant="ghost" size="sm" loading={busy === "reanalyze"} disabled={busy !== null} onClick={reanalyze} aria-label="Analizi yenile"><RefreshCw size={14} /> Yenile</Button>
      </div>

      {!analysis ? (
        <p className="mt-3 text-sm text-slate-500">Bu talep için AI analizi yok. “Yenile” ile oluşturabilirsiniz.</p>
      ) : (
        <div className="mt-4 space-y-4 text-sm">
          <Info label="Özet" value={analysis.summary} />
          {analysis.rawResponse?.rerouted && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-brand-700">AI bu talebi “{analysis.suggestedCategory}” kategorisine yönlendirdi (kullanıcının seçimi: {analysis.rawResponse.requestedCategory}).</p>
          )}
          {suggested && !locked && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-amber-800">AI farklı bir kategori öneriyor: <strong>{suggested.name}</strong> ({analysis.suggestedSupportUnit}).</p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                loading={busy === "apply-category"}
                disabled={busy !== null}
                onClick={async () => {
                  const ok = await run("apply-category", () => api.patch(`/tickets/${ticket.id}/category`, { categoryId: suggested.id }), "Kategori güncellendi.");
                  if (ok) await reload();
                }}
              >
                Öneriyi uygula
              </Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Önerilen öncelik</p>
              <div className="mt-1"><PriorityBadge priority={analysis.suggestedPriority} /></div>
            </div>
            <Info label="Etki" value={analysis.impact} />
          </div>
          <List title="Muhtemel nedenler" items={analysis.possibleCauses} />
          <List title="Çözüm adımları" items={analysis.suggestedSolutions} />
          <List title="Kullanıcıya sorulacaklar" items={analysis.questionsToAsk} />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Güven skoru</span>
              <span className="font-semibold tabular-nums text-slate-700">%{Math.round(analysis.confidenceScore * 100)}</span>
            </div>
            <div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-brand-600" style={{ width: `${Math.round(analysis.confidenceScore * 100)}%` }} /></div>
            <p className="mt-2 text-xs text-slate-400">{source === "openai" ? "Yapay zekâ modeli tarafından üretildi." : "Kural tabanlı analiz ile üretildi (model anahtarı tanımlı değil)."}</p>
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-800">Araçlar</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" loading={busy === "summary"} disabled={busy !== null} onClick={() => generate("summary")}><ListChecks size={14} /> Durumu özetle</Button>
          <Button variant="secondary" size="sm" loading={busy === "closing"} disabled={busy !== null} onClick={() => generate("closing")}><FileText size={14} /> Kapanış notu yaz</Button>
        </div>
        {output && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-400">{output.kind === "summary" ? "Durum özeti" : "Kapanış notu taslağı"}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{output.text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {output.kind === "closing" && !locked && (
                <Button size="sm" onClick={() => { onUseAsMessage(output.text); setOutput(null); }}>Mesaj kutusuna aktar</Button>
              )}
              {output.kind === "summary" && <Button size="sm" loading={busy === "save-note"} disabled={busy !== null} onClick={() => saveAsNote(output.text)}>İç not olarak kaydet</Button>}
              <Button size="sm" variant="ghost" onClick={() => setOutput(null)}>Kapat</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-slate-700">{value || "-"}</p>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="font-semibold text-slate-700">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}
