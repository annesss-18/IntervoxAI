// Best-effort first-name extraction for personalized greetings.

// Exclude common headings and job titles.
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
