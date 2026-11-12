import { Download, FileText, Image as ImageIcon, Paperclip, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../contexts/AuthContext";
import { useAction } from "../../hooks/useAction";
import { api } from "../../lib/api";
import { ACCEPT_ATTRIBUTE, attachmentPayload, fileProblem, MAX_FILES } from "../../lib/files";
import { downloadBlob, formatDateTime, formatFileSize } from "../../lib/format";
import { Ticket, TicketAttachment } from "../../types";

export function Attachments({ ticket, reload }: { ticket: Ticket; reload: () => Promise<void> }) {
  const { user } = useAuth();
  const toast = useToast();
  const { run, busy } = useAction();
  const input = useRef<HTMLInputElement>(null);
  const attachments = ticket.attachments ?? [];
  const locked = ticket.status === "CLOSED" || ticket.status === "CANCELLED";
  const full = attachments.length >= MAX_FILES;

  async function upload(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (input.current) input.current.value = "";
    if (!files.length) return;
    if (attachments.length + files.length > MAX_FILES) {
      toast.error(`Bir talebe en fazla ${MAX_FILES} dosya eklenebilir.`);
      return;
    }
    const problem = files.map(fileProblem).find(Boolean);
    if (problem) {
      toast.error(problem);
      return;
    }
    await run("upload", async () => {
      for (const file of files) await api.post(`/tickets/${ticket.id}/attachments`, await attachmentPayload(file));
    }, files.length > 1 ? "Dosyalar eklendi." : "Dosya eklendi.");
    await reload();
  }

  async function download(file: TicketAttachment) {
    await run(`download-${file.id}`, async () => {
      const res = await api.get<Blob>(`/tickets/${ticket.id}/attachments/${file.id}`, { responseType: "blob" });
      downloadBlob(res.data, file.fileName);
    });
  }

  async function remove(file: TicketAttachment) {
    if (!window.confirm(`"${file.fileName}" silinsin mi?`)) return;
    const ok = await run(`delete-${file.id}`, () => api.delete(`/tickets/${ticket.id}/attachments/${file.id}`), "Dosya silindi.");
    if (ok) await reload();
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-950">Ekler <span className="text-sm font-normal text-slate-400">({attachments.length}/{MAX_FILES})</span></h2>
        {!locked && (
          <>
            <input ref={input} type="file" multiple accept={ACCEPT_ATTRIBUTE} className="hidden" onChange={(event) => upload(event.target.files)} />
            <Button variant="secondary" size="sm" loading={busy === "upload"} disabled={full || busy !== null} onClick={() => input.current?.click()}><Paperclip size={14} /> Dosya ekle</Button>
          </>
        )}
      </div>
      {attachments.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Ek yok.{!locked && " Ekran görüntüsü veya belge ekleyebilirsiniz (her dosya en fazla 3 MB)."}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {attachments.map((file) => {
            const Icon = file.mimeType.startsWith("image/") ? ImageIcon : FileText;
            const canDelete = !locked && (user?.role !== "EMPLOYEE" || file.uploadedBy?.id === user?.id);
            return (
              <li key={file.id} className="flex items-center gap-3 py-2">
                <Icon size={18} className="shrink-0 text-slate-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{file.fileName}</p>
                  <p className="truncate text-xs text-slate-500">{formatFileSize(file.size)} · {file.uploadedBy?.name} · {formatDateTime(file.createdAt)}</p>
                </div>
                <Button variant="ghost" size="sm" loading={busy === `download-${file.id}`} onClick={() => download(file)} aria-label={`${file.fileName} dosyasını indir`}><Download size={15} /></Button>
                {canDelete && <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" loading={busy === `delete-${file.id}`} onClick={() => remove(file)} aria-label={`${file.fileName} dosyasını sil`}><Trash2 size={15} /></Button>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
