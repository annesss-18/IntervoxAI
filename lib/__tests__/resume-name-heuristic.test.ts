import { describe, expect, it } from "vitest";
import { extractCandidateName } from "@/lib/resume-name-heuristic";

describe("extractCandidateName", () => {
  it("returns null for undefined/empty resume text", () => {
    expect(extractCandidateName(undefined)).toBeNull();
    expect(extractCandidateName("")).toBeNull();
  });

  it("extracts a first name from a plain name line at the top", () => {
    const resume = "John Smith\nSenior Backend Engineer\njohn@example.com";
    expect(extractCandidateName(resume)).toBe("John");
  });

  it("title-cases an all-lowercase or all-caps name line", () => {
    expect(extractCandidateName("priya patel\nSoftware Engineer")).toBe(
      "Priya",
    );
    expect(extractCandidateName("MARIA GARCIA\nProduct Manager")).toBe("Maria");
  });

  it("skips a job-title header line and finds the real name below it (Issue 3)", () => {
    // Before the fix, "Senior Software Engineer" (3 words, no digits/@/http)
    // matched the name-shaped heuristic and was returned as the "name".
    const resume = "Senior Software Engineer\nAnnika Voss\nannika@example.com";
    expect(extractCandidateName(resume)).toBe("Annika");
  });

  it("skips a 'Professional Summary' section header", () => {
    const resume = "Professional Summary\nDavid Chen\nSummary text here.";
    expect(extractCandidateName(resume)).toBe("David");
  });

  it("skips 'Curriculum Vitae' and 'Contact Information' headers", () => {
    const resume = "Curriculum Vitae\nContact Information\nElena Petrova";
    expect(extractCandidateName(resume)).toBe("Elena");
  });

  it("returns null when every candidate line in the scanned window is a header/title", () => {
    const resume = [
      "Senior Software Engineer",
      "Professional Summary",
      "Work Experience",
      "Technical Skills",
      "Contact Information",
      "Career Objective",
      "Personal Profile",
      "Project References",
    ].join("\n");
    expect(extractCandidateName(resume)).toBeNull();
  });

  it("only scans the first 8 lines", () => {
    const resume =
      Array(8).fill("Professional Summary").join("\n") + "\nJohn Smith";
    expect(extractCandidateName(resume)).toBeNull();
  });

  it("ignores lines with emails, URLs, pipes, or long digit runs", () => {
    const resume = [
      "john.smith@example.com",
      "https://linkedin.com/in/john",
      "555 123 4567",
      "Skills | Experience | Education",
      "Real Name Here",
    ].join("\n");
    expect(extractCandidateName(resume)).toBe("Real");
  });

  it("ignores lines outside the 2-4 word range", () => {
    const resume = "John\nA Very Long Line With Six Words Total\nJane Doe";
    expect(extractCandidateName(resume)).toBe("Jane");
  });
});
