import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const testEnv = process.env as Record<string, string | undefined>;
const {
  cookieStore,
  cookiesMock,
  createSessionCookieMock,
  verifySessionCookieMock,
  userFindByIdMock,
} = vi.hoisted(() => {
  const hoistedCookieStore = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };

  return {
    cookieStore: hoistedCookieStore,
    cookiesMock: vi.fn(async () => hoistedCookieStore),
    createSessionCookieMock: vi.fn(),
    verifySessionCookieMock: vi.fn(),
    userFindByIdMock: vi.fn(),
  };
});

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/firebase/admin", () => ({
  auth: {
    createSessionCookie: createSessionCookieMock,
    verifySessionCookie: verifySessionCookieMock,
    verifyIdToken: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  UserRepository: {
    createTransactionally: vi.fn(),
    findById: userFindByIdMock,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe("AuthService.setSessionCookie", () => {
  const originalNodeEnv = testEnv.NODE_ENV;
  const originalVercelEnv = testEnv.VERCEL_ENV;

  beforeEach(() => {
    vi.resetModules();
    cookieStore.set.mockReset();
    cookieStore.get.mockReset();
    cookieStore.delete.mockReset();
    cookiesMock.mockClear();
    createSessionCookieMock.mockReset().mockResolvedValue("session-cookie");
    verifySessionCookieMock.mockReset();
    userFindByIdMock.mockReset();

    testEnv.NODE_ENV = "production";
    delete testEnv.VERCEL_ENV;
  });

  it("sets a strict, secure session cookie in production", async () => {
    const { AuthService } = await import("@/lib/services/auth.service");
    await AuthService.setSessionCookie("id-token");

    expect(createSessionCookieMock).toHaveBeenCalledWith("id-token", {
      expiresIn: 60 * 60 * 24 * 5 * 1000,
    });
    expect(cookieStore.set).toHaveBeenCalledWith(
      "session",
      "session-cookie",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 5,
        path: "/",
        sameSite: "strict",
        secure: true,
      }),
    );
  });

  it("keeps sameSite strict but disables secure outside production", async () => {
    const { AuthService } = await import("@/lib/services/auth.service");
    testEnv.NODE_ENV = "development";

    await AuthService.setSessionCookie("id-token");

    expect(cookieStore.set).toHaveBeenCalledWith(
      "session",
      "session-cookie",
      expect.objectContaining({
        sameSite: "strict",
        secure: false,
      }),
    );
  });

  it("treats a Vercel production environment as secure", async () => {
    const { AuthService } = await import("@/lib/services/auth.service");
    testEnv.NODE_ENV = "development";
    testEnv.VERCEL_ENV = "production";

    await AuthService.setSessionCookie("id-token");

    expect(cookieStore.set).toHaveBeenCalledWith(
      "session",
      "session-cookie",
      expect.objectContaining({
        sameSite: "strict",
        secure: true,
      }),
    );
  });

  it("returns lightweight auth claims without loading the Firestore user", async () => {
    const { AuthService } = await import("@/lib/services/auth.service");
    cookieStore.get.mockReturnValue({ value: "session-cookie" });
    verifySessionCookieMock.mockResolvedValue({
      uid: "user-123",
      email: "Test@Example.com",
    });

    const claims = await AuthService.getCurrentUserClaims();

    expect(claims).toEqual({
      id: "user-123",
      email: "test@example.com",
    });
    expect(userFindByIdMock).not.toHaveBeenCalled();
  });

  it("loads the Firestore user profile for getCurrentUser", async () => {
    const { AuthService } = await import("@/lib/services/auth.service");
    cookieStore.get.mockReturnValue({ value: "session-cookie" });
    verifySessionCookieMock.mockResolvedValue({
      uid: "user-123",
      email: "test@example.com",
    });
    userFindByIdMock.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    });

    const user = await AuthService.getCurrentUser();

    expect(userFindByIdMock).toHaveBeenCalledWith("user-123");
    expect(user).toEqual({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    });
  });

  afterAll(() => {
    testEnv.NODE_ENV = originalNodeEnv;
    if (originalVercelEnv === undefined) {
      delete testEnv.VERCEL_ENV;
    } else {
      testEnv.VERCEL_ENV = originalVercelEnv;
    }
  });
});
