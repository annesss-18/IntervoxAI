export const PDF_MIME = "application/pdf";
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const TXT_MIME = "text/plain";
export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Maximum number of characters stored or processed for a resume.
 *
 * Used in three places that previously had divergent hard-coded values
 * (4 000 in /api/live/token, 5 000 in /api/resume/parse and the session
 * PATCH route).  Centralising here ensures they stay in sync.
 *
 * 5 000 chars ≈ one full page of dense résumé text, which is enough to
 * capture contact info, summary, 2–3 full job descriptions, skills, and
 * education without pushing the Gemini Live token budget too hard.
 */
export const RESUME_MAX_STORED_CHARS = 5_000;
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
