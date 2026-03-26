export const PDF_MIME = "application/pdf";
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const TXT_MIME = "text/plain";
export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
export const RESUME_FILE_ACCEPT = [
  ".pdf",
  ".docx",
  ".txt",
  PDF_MIME,
  DOCX_MIME,
  TXT_MIME,
].join(",");

export function isAllowedResumeFile(file: { type: string; name: string }) {
  const name = file.name.toLowerCase();

  return (
    file.type === PDF_MIME ||
    file.type === DOCX_MIME ||
    file.type === TXT_MIME ||
    name.endsWith(".pdf") ||
    name.endsWith(".docx") ||
    name.endsWith(".txt")
  );
}
