export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const MAX_FILES = 5;
export const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];
export const ACCEPT_ATTRIBUTE = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.csv,.docx,.xlsx";

/** Returns a user-facing reason when the file cannot be uploaded, otherwise null. */
export function fileProblem(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) return `"${file.name}" desteklenmeyen bir dosya türü (PNG, JPG, PDF, TXT, CSV, DOCX, XLSX yükleyebilirsiniz).`;
  if (file.size > MAX_FILE_BYTES) return `"${file.name}" 3 MB sınırını aşıyor.`;
  if (file.size === 0) return `"${file.name}" boş bir dosya.`;
  return null;
}

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Dosya okunamadı"));
    reader.readAsDataURL(file);
  });
}

export async function attachmentPayload(file: File) {
  return { fileName: file.name, mimeType: file.type, dataBase64: await fileToBase64(file) };
}
