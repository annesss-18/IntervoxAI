import { beforeEach, describe, expect, it, vi } from "vitest";

const { interviewSessionsGetMock, userUpdateMock } = vi.hoisted(() => ({
  interviewSessionsGetMock: vi.fn(),
  userUpdateMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/firebase/admin", () => {
  const createQuery = () => ({
    where: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    count: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({
        data: () => ({ count: 2 }),
      }),
    }),
    get: interviewSessionsGetMock,
  });

  return {
    db: {
      runTransaction: vi.fn(async (fn: (t: unknown) => Promise<unknown>) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
          update: vi.fn((_ref: unknown, data: unknown) => {
            userUpdateMock(data);
          }),
        };
        return fn(transaction);
      }),
      collection: vi.fn((name: string) => {
        if (name === "interview_sessions") {
          return createQuery();
        }

        if (name === "users") {
          return {
            doc: vi.fn().mockReturnValue({
              update: userUpdateMock,
            }),
          };
        }

        throw new Error(`Unexpected collection access: ${name}`);
      }),
    },
    auth: {},
  };
});

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

describe("UserRepository.reconcileStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recomputes aggregate counters from interview sessions and persists them", async () => {
    interviewSessionsGetMock.mockResolvedValue({
      docs: [
        { data: () => ({ status: "completed", finalScore: 84 }) },
        { data: () => ({ status: "completed" }) },
      ],
    });

    const { UserRepository } =
      await import("@/lib/repositories/user.repository");
    const stats = await UserRepository.reconcileStats("user-1");

    expect(stats).toEqual({
      activeCount: 2,
      completedCount: 2,
      scoreSum: 84,
      scoreCount: 1,
    });

    expect(userUpdateMock).toHaveBeenCalledWith({
      "stats.activeCount": 2,
      "stats.completedCount": 2,
      "stats.scoreSum": 84,
      "stats.scoreCount": 1,
    });
  });
});
