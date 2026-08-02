// Verify bounded pagination of scored completed sessions.

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGet, mockCollection } = vi.hoisted(() => {
  const mockGet = vi.fn();

  const chain: Record<string, unknown> = {};
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.startAfter = vi.fn(() => chain);
  chain.get = mockGet;

  const mockCollection = vi.fn(() => chain);

  return { mockGet, mockCollection };
});

vi.mock("@/firebase/admin", () => ({ db: { collection: mockCollection } }));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), audit: vi.fn() },
}));

vi.mock("@/lib/resume-crypto", () => ({
  decryptResumeText: vi.fn((v: unknown) => v),
  isEncryptedResumeText: vi.fn(() => false),
}));

function fakeDoc(id: string, finalScore: number | null, startedAt: string) {
  return {
    id,
    data: () => ({
      templateId: "template-1",
      templateSnapshot: null,
      userId: "user-1",
      status: "completed",
      startedAt,
      finalScore,
    }),
  };
}

function fullBatch(prefix: string, finalScore: number | null, count = 10) {
  return Array.from({ length: count }, (_, i) =>
    fakeDoc(
      `${prefix}${i}`,
      finalScore,
      `2026-01-${String(i + 1).padStart(2, "0")}`,
    ),
  );
}

describe("InterviewRepository.findCompletedWithScores", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockCollection.mockClear();
  });

  it("returns from a single batch when it already has enough scored sessions", async () => {
    const { InterviewRepository } =
      await import("@/lib/repositories/interview.repository");
    mockGet.mockResolvedValueOnce({ empty: false, docs: fullBatch("d", 80) });

    const result = await InterviewRepository.findCompletedWithScores(
      "user-1",
      5,
    );

    expect(result).toHaveLength(5);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("fetches a second batch when the first doesn't have enough scored sessions", async () => {
    const { InterviewRepository } =
      await import("@/lib/repositories/interview.repository");

    // The first batch contains only two scored sessions.
    const batch1 = [
      fakeDoc("d1", 80, "2026-01-10"),
      fakeDoc("d2", null, "2026-01-09"),
      fakeDoc("d3", null, "2026-01-08"),
      fakeDoc("d4", 70, "2026-01-07"),
      fakeDoc("d5", null, "2026-01-06"),
      fakeDoc("d6", null, "2026-01-05"),
      fakeDoc("d7", null, "2026-01-04"),
      fakeDoc("d8", null, "2026-01-03"),
      fakeDoc("d9", null, "2026-01-02"),
      fakeDoc("d10", null, "2026-01-01"),
    ];
    const batch2 = fullBatch("e", 90);

    mockGet
      .mockResolvedValueOnce({ empty: false, docs: batch1 })
      .mockResolvedValueOnce({ empty: false, docs: batch2 });

    const result = await InterviewRepository.findCompletedWithScores(
      "user-1",
      5,
    );

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(5);
    expect(result.map((r) => r.id)).toEqual(["d1", "d4", "e0", "e1", "e2"]);
  });

  it("stops with fewer than `limit` once the collection is exhausted (short page)", async () => {
    const { InterviewRepository } =
      await import("@/lib/repositories/interview.repository");
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [fakeDoc("only-one", 85, "2026-01-01")],
    });

    const result = await InterviewRepository.findCompletedWithScores(
      "user-1",
      5,
    );

    expect(result).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("returns an empty array when there are no completed sessions at all", async () => {
    const { InterviewRepository } =
      await import("@/lib/repositories/interview.repository");
    mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await InterviewRepository.findCompletedWithScores(
      "user-1",
      5,
    );

    expect(result).toEqual([]);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("stops after a bounded number of batches even if still short of `limit` (Issue 6 correctness bound)", async () => {
    const { InterviewRepository } =
      await import("@/lib/repositories/interview.repository");

    // Bound full scoreless pages to avoid an infinite loop.
    mockGet
      .mockResolvedValueOnce({ empty: false, docs: fullBatch("a", null) })
      .mockResolvedValueOnce({ empty: false, docs: fullBatch("b", null) })
      .mockResolvedValueOnce({ empty: false, docs: fullBatch("c", null) })
      .mockResolvedValueOnce({ empty: false, docs: fullBatch("d", null) });

    const result = await InterviewRepository.findCompletedWithScores(
      "user-1",
      5,
    );

    expect(result).toEqual([]);
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it("returns an empty array if Firestore throws", async () => {
    const { InterviewRepository } =
      await import("@/lib/repositories/interview.repository");
    mockGet.mockRejectedValueOnce(new Error("firestore unavailable"));

    const result = await InterviewRepository.findCompletedWithScores(
      "user-1",
      5,
    );

    expect(result).toEqual([]);
  });
});
