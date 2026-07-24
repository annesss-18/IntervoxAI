// Best-effort extraction of a candidate's first name from the top of their
// resume text, used only to personalize the AI interviewer's opening
// greeting (e.g. "Hey Priya, ..."). This is a heuristic, not a name parser:
// it looks for a short, name-shaped line near the top of the document and
// filters out the most common false positives (resume section headers and
// job titles, which are also short 2-4 word phrases). It cannot be perfect
// — if it can't find a confident match, callers fall back to a generic
// greeting ("Hey there, ...").

// Common resume header / job-title words that would otherwise pass the
// name-shaped heuristic below — e.g. "Senior Software Engineer" or
// "Professional Summary" both look like a 2-4 word name until you check
// the words themselves. Not exhaustive: this is a best-effort filter for a
// cosmetic opening greeting, not a name-extraction guarantee.
const NAME_HEURISTIC_DENYLIST = new Set([
  "engineer",
  "developer",
  "manager",
  "designer",
  "analyst",
  "consultant",
  "director",
  "specialist",
  "architect",
  "scientist",
  "administrator",
  "coordinator",
  "executive",
  "officer",
  "lead",
  "senior",
  "junior",
  "summary",
  "resume",
  "curriculum",
  "vitae",
  "objective",
  "profile",
  "experience",
  "education",
  "skills",
  "contact",
  "portfolio",
  "certifications",
  "certification",
  "projects",
  "references",
  "achievements",
  "employment",
  "career",
  "qualifications",
  "intern",
  "internship",
  "professional",
  "information",
  "personal",
  "about",
  "overview",
]);

export function extractCandidateName(resumeText?: string): string | null {
  if (!resumeText) return null;

  const lines = resumeText.split("\n").slice(0, 8);
  for (const line of lines) {
    const cleaned = line.trim();
    if (
      cleaned.length > 2 &&
      cleaned.length < 50 &&
      cleaned.split(" ").length >= 2 &&
      cleaned.split(" ").length <= 4 &&
      !cleaned.includes("@") &&
      !cleaned.includes("http") &&
      !cleaned.includes("|") &&
      !/\d{3,}/.test(cleaned)
    ) {
      const parts = cleaned.split(" ").filter(Boolean);

      const looksLikeHeaderOrTitle = parts.some((word) =>
        NAME_HEURISTIC_DENYLIST.has(word.toLowerCase().replace(/[^a-z]/g, "")),
      );
      if (looksLikeHeaderOrTitle) continue;

      const rawFirst = parts[0];
      if (!rawFirst) continue;
      return rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase();
    }
  }

  return null;
}
