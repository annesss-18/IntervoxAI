// Cover stat-counter symmetry across create, complete, and delete flows.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks keep repository imports stable across each test.
const {
  mockDb,
  mockUserRepoUpdateStats,
  mockTemplateRepoUpdateAvgScore,
  mockFeedbackRepoCreate,
  mockInterviewRepoFindById,
} = vi.hoisted(() => {
  const sessionRef = {
    get: vi.fn(),
    update: vi.fn(),
    id: "test-session-123",
  };

  const batchMock = {
    delete: vi.fn(),
    commit: vi.fn(),
  };

  return {
    mockDb: {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(sessionRef),
        where: vi.fn().mockReturnThis(),
        get: vi.fn(),
      }),
      batch: vi.fn().mockReturnValue(batchMock),
      runTransaction: vi.fn(),
    },
    mockUserRepoUpdateStats: vi.fn().mockResolvedValue(undefined),
    mockTemplateRepoUpdateAvgScore: vi.fn().mockResolvedValue(undefined),
    mockFeedbackRepoCreate: vi.fn().mockResolvedValue("feedback-id-123"),
    mockInterviewRepoFindById: vi.fn(),
  };
});

vi.mock("@/firebase/admin", () => ({ db: mockDb }));

vi.mock("@/lib/repositories/user.repository", () => ({
  UserRepository: {
    updateStats: mockUserRepoUpdateStats,
    findById: vi.fn(),
    createTransactionally: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/template.repository", () => ({
  TemplateRepository: {
    updateAvgScore: mockTemplateRepoUpdateAvgScore,
    findById: vi.fn(),
    findManyByIds: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/feedback.repository", () => ({
  FeedbackRepository: {
    create: mockFeedbackRepoCreate,
    findByInterviewId: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/interview.repository", () => ({
  InterviewRepository: {
    findById: mockInterviewRepoFindById,
    findByUserIdPaginated: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn(<T extends (...args: never[]) => unknown>(fn: T) => fn),
}));

describe("Interview lifecycle counter symmetry", () => {
  const userId = "user-abc";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("session CREATE should increment activeDelta by +1", async () => {
    const { UserRepository } =
      await import("@/lib/repositories/user.repository");

    await UserRepository.updateStats(userId, { activeDelta: 1 });

    expect(mockUserRepoUpdateStats).toHaveBeenCalledWith(userId, {
      activeDelta: 1,
    });
  });

  it("feedback COMPLETE should decrement active and increment completed + score", async () => {
    const { UserRepository } =
      await import("@/lib/repositories/user.repository");

    const finalScore = 82;
    await UserRepository.updateStats(userId, {
      activeDelta: -1,
      completedDelta: 1,
      scoreDelta: finalScore,
      scoreCount: 1,
    });

    expect(mockUserRepoUpdateStats).toHaveBeenCalledWith(userId, {
      activeDelta: -1,
      completedDelta: 1,
      scoreDelta: 82,
      scoreCount: 1,
    });
  });

  it("DELETE of a completed session should decrement completedCount and reverse score", async () => {
    const { UserRepository } =
      await import("@/lib/repositories/user.repository");

    const finalScore = 82;
    await UserRepository.updateStats(userId, {
      completedDelta: -1,
      scoreDelta: -finalScore,
      scoreCount: -1,
    });

    expect(mockUserRepoUpdateStats).toHaveBeenCalledWith(userId, {
      completedDelta: -1,
      scoreDelta: -82,
      scoreCount: -1,
    });
  });

  it("DELETE of an active (non-completed) session should only decrement activeDelta", async () => {
    const { UserRepository } =
      await import("@/lib/repositories/user.repository");

    await UserRepository.updateStats(userId, { activeDelta: -1 });

    expect(mockUserRepoUpdateStats).toHaveBeenCalledWith(userId, {
      activeDelta: -1,
    });
    expect(mockUserRepoUpdateStats).not.toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ completedDelta: expect.any(Number) }),
    );
  });

  it("full lifecycle create -> complete -> delete should net to zero stat changes", async () => {
    const { UserRepository } =
      await import("@/lib/repositories/user.repository");

    const finalScore = 75;

    await UserRepository.updateStats(userId, { activeDelta: 1 });
    await UserRepository.updateStats(userId, {
      activeDelta: -1,
      completedDelta: 1,
      scoreDelta: finalScore,
      scoreCount: 1,
    });
    await UserRepository.updateStats(userId, {
      completedDelta: -1,
      scoreDelta: -finalScore,
      scoreCount: -1,
    });

    expect(mockUserRepoUpdateStats).toHaveBeenCalledTimes(3);

    const allCalls = mockUserRepoUpdateStats.mock.calls;
    const netDeltas = {
      activeDelta: 0,
      completedDelta: 0,
      scoreDelta: 0,
      scoreCount: 0,
    };

    for (const [, delta] of allCalls) {
      if (delta.activeDelta !== undefined) {
        netDeltas.activeDelta += delta.activeDelta;
      }
      if (delta.completedDelta !== undefined) {
        netDeltas.completedDelta += delta.completedDelta;
      }
      if (delta.scoreDelta !== undefined) {
        netDeltas.scoreDelta += delta.scoreDelta;
      }
      if (delta.scoreCount !== undefined) {
        netDeltas.scoreCount += delta.scoreCount;
      }
    }

    expect(netDeltas.activeDelta).toBe(0);
    expect(netDeltas.completedDelta).toBe(0);
    expect(netDeltas.scoreDelta).toBe(0);
    expect(netDeltas.scoreCount).toBe(0);
  });

  it("DELETE of a completed session WITHOUT finalScore should not reverse score counters", async () => {
    const { UserRepository } =
      await import("@/lib/repositories/user.repository");

    await UserRepository.updateStats(userId, { completedDelta: -1 });

    expect(mockUserRepoUpdateStats).toHaveBeenCalledWith(userId, {
      completedDelta: -1,
    });
    expect(mockUserRepoUpdateStats).not.toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ scoreDelta: expect.any(Number) }),
    );
  });
});
