import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { PriorityBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, PageHeader } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { useFetch } from "../../hooks/useFetch";
import { api, apiError } from "../../lib/api";
import { ACCEPT_ATTRIBUTE, attachmentPayload, fileProblem, MAX_FILES } from "../../lib/files";
import { formatFileSize } from "../../lib/format";
import { AiAnalysisResult, ApiResponse, Category, Ticket } from "../../types";

const schema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalı").max(160, "Başlık en fazla 160 karakter olabilir"),
  description: z.string().trim().min(10, "Sorunu en az 10 karakterle açıklayın").max(5000, "Açıklama en fazla 5000 karakter olabilir"),
  categoryId: z.string().min(1, "Kategori seçin"),
  location: z.string().trim().max(160).optional()
});
type FormValues = z.infer<typeof schema>;

export function NewTicketPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const categories = useFetch<Category[]>("/categories");
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<AiAnalysisResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const { register, handleSubmit, getValues, setValue, trigger, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { categoryId: "" } });

  const activeCategories = (categories.data ?? []).filter((category) => category.isActive);
  const suggestedCategory = preview ? activeCategories.find((category) => category.name === preview.category) : undefined;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      const problem = fileProblem(file);
      if (problem) toast.error(problem);
      else if (next.length >= MAX_FILES) toast.error(`En fazla ${MAX_FILES} dosya ekleyebilirsiniz.`);
      else if (!next.some((item) => item.name === file.name && item.size === file.size)) next.push(file);
    }
    setFiles(next);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function runPreview() {
    if (!(await trigger(["title", "description"]))) return;
    setPreviewing(true);
    try {
      const { title, description } = getValues();
      const res = await api.post<ApiResponse<AiAnalysisResult>>("/ai/analyze-ticket", { title, description });
      setPreview(res.data.data);
    } catch (error) {
      toast.error(apiError(error, "Ön analiz yapılamadı."));
    } finally {
      setPreviewing(false);
    }
  }

  async function onSubmit(values: FormValues) {
    let ticket: Ticket;
    try {
      const res = await api.post<ApiResponse<Ticket>>("/tickets", { ...values, location: values.location || null });
      ticket = res.data.data;
    } catch (error) {
      toast.error(apiError(error, "Talep oluşturulamadı."));
      return;
    }

    // The ticket exists at this point; a failed upload must not lose it.
    const failed: string[] = [];
    for (const file of files) {
      try {
        await api.post(`/tickets/${ticket.id}/attachments`, await attachmentPayload(file));
      } catch {
        failed.push(file.name);
      }
    }
    if (failed.length) toast.error(`Talep oluşturuldu ancak şu dosyalar yüklenemedi: ${failed.join(", ")}. Talep sayfasından tekrar ekleyebilirsiniz.`);
    else toast.success(`${ticket.ticketNumber} numaralı talebiniz oluşturuldu.`);
    navigate(`/employee/tickets/${ticket.id}`);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Yeni Talep" description="Sorunu ne kadar net anlatırsanız o kadar hızlı çözülür. Talebiniz yapay zekâ ile analiz edilip ilgili ekibe yönlendirilir." />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="title">Başlık</label>
              <input id="title" placeholder="Örn. Yazıcı çıktı vermiyor" className="input" {...register("title")} />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="description">Açıklama</label>
              <textarea id="description" rows={7} placeholder="Ne oldu, ne zaman başladı, ekranda hangi hata görünüyor, kimler etkileniyor?" className="input" {...register("description")} />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="categoryId">Kategori</label>
                <select id="categoryId" className="input" disabled={categories.loading} {...register("categoryId")}>
                  <option value="">{categories.loading ? "Yükleniyor..." : "Kategori seçin"}</option>
                  {activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                {errors.categoryId && <p className="mt-1 text-xs text-red-600">{errors.categoryId.message}</p>}
                {categories.error && <p className="mt-1 text-xs text-red-600">Kategoriler yüklenemedi. <button type="button" className="font-semibold underline" onClick={categories.reload}>Tekrar dene</button></p>}
              </div>
              <div>
                <label className="label" htmlFor="location">Konum <span className="font-normal text-slate-400">(isteğe bağlı)</span></label>
                <input id="location" placeholder="Örn. 2. kat, 204 numaralı oda" className="input" {...register("location")} />
              </div>
            </div>

            <div>
              <span className="label">Dosya ekle <span className="font-normal text-slate-400">(isteğe bağlı, en fazla {MAX_FILES} dosya, her biri 3 MB)</span></span>
              <input ref={fileInput} type="file" multiple accept={ACCEPT_ATTRIBUTE} className="hidden" onChange={(event) => addFiles(event.target.files)} />
              <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={files.length >= MAX_FILES}><Paperclip size={16} /> Ekran görüntüsü veya belge seç</Button>
              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((file) => (
                    <li key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="truncate text-slate-700">{file.name} <span className="text-slate-400">· {formatFileSize(file.size)}</span></span>
                      <button type="button" onClick={() => setFiles((current) => current.filter((item) => item !== file))} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label={`${file.name} dosyasını kaldır`}><X size={15} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" loading={isSubmitting}>{isSubmitting ? "Talep analiz ediliyor..." : "Talep Oluştur"}</Button>
              <Button variant="secondary" onClick={runPreview} loading={previewing} disabled={isSubmitting}><Sparkles size={16} /> AI ön analiz</Button>
            </div>
          </form>
        </Card>

        <Card className="h-fit">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-950"><Sparkles size={18} className="text-brand-600" /> AI ön analiz</h2>
          {!preview ? (
            <p className="mt-3 text-sm text-slate-500">Başlık ve açıklamayı yazıp “AI ön analiz”e basın. Talebi göndermeden önce önerilen kategoriyi ve kendi başınıza deneyebileceğiniz adımları görürsünüz.</p>
          ) : (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Önerilen kategori</p>
                <p className="mt-1 font-medium text-slate-800">{preview.category}</p>
                <p className="text-slate-500">{preview.supportUnit}</p>
                {suggestedCategory && getValues("categoryId") !== suggestedCategory.id && (
                  <Button size="sm" variant="secondary" className="mt-2" onClick={() => setValue("categoryId", suggestedCategory.id, { shouldValidate: true })}>Bu kategoriyi seç</Button>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Tahmini öncelik</p>
                <div className="mt-1"><PriorityBadge priority={preview.priority} /></div>
              </div>
              {preview.suggestedSolutions.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700">Beklerken deneyebilecekleriniz</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">{preview.suggestedSolutions.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              )}
              {preview.questionsToAsk.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700">Açıklamaya eklerseniz işimizi hızlandırır</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">{preview.questionsToAsk.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              )}
              <p className="text-xs text-slate-400">{preview.source === "openai" ? "Yapay zekâ modeli tarafından üretildi." : "Kural tabanlı analiz ile üretildi."} Öneridir; kesin sınıflandırmayı BT ekibi yapar.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
