// extractTextFromFile() races unpdf/mammoth against a timer (see
// lib/server/file-parser.ts for why a true cancel isn't possible for
// CPU-bound synchronous work). These tests use fake timers to simulate a
// parse that never resolves, without actually waiting FILE_PARSE_TIMEOUT_MS
// in real time.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockExtractText, mockExtractRawText } = vi.hoisted(() => ({
  mockExtractText: vi.fn(),
  mockExtractRawText: vi.fn(),
}));

vi.mock("unpdf", () => ({ extractText: mockExtractText }));
vi.mock("mammoth", () => ({
  default: { extractRawText: mockExtractRawText },
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), audit: vi.fn() },
}));

function makePdfFile(): File {
  // Real content doesn't matter — extractText() is mocked — but the magic
  // bytes must pass extractTextFromFile's own "%PDF" sniff check first.
  const bytes = new TextEncoder().encode("%PDF-1.4\nfake pdf bytes");
  return new File([bytes], "resume.pdf", { type: "application/pdf" });
}

function makeDocxFile(): File {
  const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]); // "PK.."
  return new File([bytes], "resume.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

describe("extractTextFromFile timeout (Issue 7)", () => {
  beforeEach(() => {
    mockExtractText.mockReset();
    mockExtractRawText.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves normally when PDF parsing finishes well within the budget", async () => {
    const { extractTextFromFile } = await import("@/lib/server/file-parser");
    mockExtractText.mockResolvedValueOnce({
      text: "A perfectly ordinary resume with plenty of extractable text.",
    });

    const text = await extractTextFromFile(makePdfFile());
    expect(text).toContain("perfectly ordinary resume");
  });

  it("rejects with FileParseTimeoutError when PDF parsing hangs past the budget", async () => {
    const {
      extractTextFromFile,
      isFileParseTimeoutError,
      FILE_PARSE_TIMEOUT_MS,
    } = await import("@/lib/server/file-parser");

    vi.useFakeTimers();
    // Never resolves — simulates a pathological/hanging parse.
    mockExtractText.mockImplementationOnce(() => new Promise(() => {}));

    const pending = extractTextFromFile(makePdfFile());
    // Attach the rejection assertion before advancing time so there's no
    // unhandled-rejection window between the timer firing and the assert.
    const assertion = expect(pending).rejects.toSatisfy((error: unknown) =>
      isFileParseTimeoutError(error),
    );

    await vi.advanceTimersByTimeAsync(FILE_PARSE_TIMEOUT_MS);
    await assertion;
  });

  it("rejects with FileParseTimeoutError when DOCX parsing hangs past the budget", async () => {
    const {
      extractTextFromFile,
      isFileParseTimeoutError,
      FILE_PARSE_TIMEOUT_MS,
    } = await import("@/lib/server/file-parser");

    vi.useFakeTimers();
    mockExtractRawText.mockImplementationOnce(() => new Promise(() => {}));

    const pending = extractTextFromFile(makeDocxFile());
    const assertion = expect(pending).rejects.toSatisfy((error: unknown) =>
      isFileParseTimeoutError(error),
    );

    await vi.advanceTimersByTimeAsync(FILE_PARSE_TIMEOUT_MS);
    await assertion;
  });

  it("the timeout error message names the file kind and doesn't get overwritten by the generic error path", async () => {
    const { extractTextFromFile, FILE_PARSE_TIMEOUT_MS } =
      await import("@/lib/server/file-parser");

    vi.useFakeTimers();
    mockExtractText.mockImplementationOnce(() => new Promise(() => {}));

    const pending = extractTextFromFile(makePdfFile());
    const assertion = expect(pending).rejects.toThrow(/PDF.*too long/i);

    await vi.advanceTimersByTimeAsync(FILE_PARSE_TIMEOUT_MS);
    await assertion;
  });
});
