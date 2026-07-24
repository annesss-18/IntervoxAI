// needsTemplateRegeneration() decides whether a template PATCH must
// regenerate baseQuestions/systemInstruction/interviewerPersona/
// companyCultureInsights, or can update Firestore directly. Getting this
// wrong in either direction is bad: false-negative silently leaves the
// interview out of sync with the displayed job description (the original
// bug); false-positive burns an unnecessary Gemini call and rate-limit
// budget on every save.

import { describe, expect, it } from "vitest";
import { needsTemplateRegeneration } from "@/lib/services/template-generation.service";
import type { InterviewTemplate } from "@/types";

function baseTemplate(): Pick<
  InterviewTemplate,
  "role" | "companyName" | "level" | "type" | "jobDescription" | "techStack"
> {
  return {
    role: "Backend Engineer",
    companyName: "Acme Corp",
    level: "Mid",
    type: "Technical",
    jobDescription: "We are looking for a backend engineer. ".repeat(3),
    techStack: ["Node.js", "PostgreSQL", "Docker"],
  };
}

describe("needsTemplateRegeneration", () => {
  it("returns false for an empty patch", () => {
    expect(needsTemplateRegeneration(baseTemplate(), {})).toBe(false);
  });

  it("returns false when every AI-input field is resubmitted unchanged", () => {
    // Mirrors what EditTemplateForm actually sends: role/companyName/level/
    // type/techStack are always present in the PATCH body, even when the
    // user only touched an unrelated field like visibility.
    const current = baseTemplate();
    expect(
      needsTemplateRegeneration(current, {
        role: current.role,
        companyName: current.companyName,
        level: current.level,
        type: current.type,
        techStack: [...current.techStack],
      }),
    ).toBe(false);
  });

  it("returns false for tech stack reordering alone", () => {
    const current = baseTemplate();
    expect(
      needsTemplateRegeneration(current, {
        techStack: ["Docker", "Node.js", "PostgreSQL"],
      }),
    ).toBe(false);
  });

  it("returns false for tech stack casing/whitespace differences alone", () => {
    const current = baseTemplate();
    expect(
      needsTemplateRegeneration(current, {
        techStack: [" node.js ", "postgresql", "DOCKER"],
      }),
    ).toBe(false);
  });

  it("returns true when the job description changes", () => {
    expect(
      needsTemplateRegeneration(baseTemplate(), {
        jobDescription: "A completely different job description. ".repeat(3),
      }),
    ).toBe(true);
  });

  it("returns true when role changes", () => {
    expect(
      needsTemplateRegeneration(baseTemplate(), { role: "Frontend Engineer" }),
    ).toBe(true);
  });

  it("returns true when level changes", () => {
    expect(needsTemplateRegeneration(baseTemplate(), { level: "Senior" })).toBe(
      true,
    );
  });

  it("returns true when type changes", () => {
    expect(
      needsTemplateRegeneration(baseTemplate(), { type: "System Design" }),
    ).toBe(true);
  });

  it("returns true when companyName changes", () => {
    expect(
      needsTemplateRegeneration(baseTemplate(), { companyName: "Globex" }),
    ).toBe(true);
  });

  it("returns true when a tech stack item is added", () => {
    const current = baseTemplate();
    expect(
      needsTemplateRegeneration(current, {
        techStack: [...current.techStack, "Kubernetes"],
      }),
    ).toBe(true);
  });

  it("returns true when a tech stack item is removed", () => {
    const current = baseTemplate();
    expect(
      needsTemplateRegeneration(current, {
        techStack: current.techStack.slice(0, -1),
      }),
    ).toBe(true);
  });

  it("ignores cosmetic-only fields (companyLogoUrl, isPublic are not part of the type at all)", () => {
    // needsTemplateRegeneration's patch type only accepts AI-input fields,
    // so companyLogoUrl/isPublic changes can't be expressed here — this
    // test documents that guarantee via the empty-patch case instead.
    expect(needsTemplateRegeneration(baseTemplate(), {})).toBe(false);
  });
});
