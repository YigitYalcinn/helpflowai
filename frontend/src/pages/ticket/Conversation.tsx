import { Send, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useAction } from "../../hooks/useAction";
import { api } from "../../lib/api";
import { formatDateTime, roleLabels } from "../../lib/format";
import { cn } from "../../lib/utils";
import { ApiResponse, Ticket } from "../../types";

type Props = { ticket: Ticket; reload: () => Promise<void>; draft: string; setDraft: (value: string) => void };

export function Conversation({ ticket, reload, draft, setDraft }: Props) {
  const { user } = useAuth();
  const { run, busy } = useAction();
  const isStaff = user?.role !== "EMPLOYEE";
  const locked = ticket.status === "CLOSED" || ticket.status === "CANCELLED";
  const messages = ticket.messages ?? [];

  async function send() {
    const message = draft.trim();
    if (!message) return;
    const ok = await run("send", () => api.post(`/tickets/${ticket.id}/messages`, { message }));
    if (!ok) return;
    setDraft("");
    await reload();
  }

  async function suggest() {
    await run("suggest", async () => {
      const res = await api.post<ApiResponse<{ reply: string }>>(`/ai/tickets/${ticket.id}/suggest-reply`);
      setDraft(res.data.data.reply);
    });
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-950">Yazışma</h2>
      <div className="mt-4 space-y-3">
        {messages.length === 0 && <p className="text-sm text-slate-500">Henüz mesaj yok.{!locked && (isStaff ? " Kullanıcıya ilk yanıtı siz yazın." : " BT ekibine iletmek istediğiniz ek bilgiyi yazabilirsiniz.")}</p>}
        {messages.map((item) => {
          const own = item.sender?.id === user?.id;
          return (
            <div key={item.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-lg px-3 py-2", own ? "bg-brand-50" : "bg-slate-50")}>
                <p className="text-xs font-semibold text-slate-600">
                  {own ? "Siz" : item.sender?.name}
                  {!own && item.sender && <span className="font-normal text-slate-400"> · {roleLabels[item.sender.role]}</span>}
                  <span className="font-normal text-slate-400"> · {formatDateTime(item.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{item.message}</p>
              </div>
            </div>
          );
        })}
      </div>

      {locked ? (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">Bu talep kapatıldığı için yeni mesaj yazılamıyor.{ticket.status === "CLOSED" && " Devam etmek için talebi yeniden açın."}</p>
      ) : (
        <div className="mt-4">
          {ticket.status === "WAITING_USER" && !isStaff && <p className="mb-2 rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700">BT ekibi sizden yanıt bekliyor.</p>}
          <label className="sr-only" htmlFor="reply">Mesajınız</label>
          <textarea
            id="reply"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) send();
            }}
            rows={draft.length > 160 ? 7 : 3}
            maxLength={4000}
            className="input"
            placeholder="Mesajınızı yazın... (Ctrl+Enter ile gönderin)"
          />
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            {isStaff && <Button variant="secondary" loading={busy === "suggest"} disabled={busy !== null} onClick={suggest}><Sparkles size={16} /> AI yanıt öner</Button>}
            <Button loading={busy === "send"} disabled={!draft.trim() || busy !== null} onClick={send}><Send size={16} /> Gönder</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
