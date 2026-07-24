import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockLoggerWarn } = vi.hoisted(() => ({
  mockLoggerWarn: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: mockLoggerWarn,
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    audit: vi.fn(),
  },
}));

function mockHeaders(entries: Record<string, string>): {
  get(name: string): string | null;
} {
  const lower = Object.fromEntries(
    Object.entries(entries).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return { get: (name: string) => lower[name.toLowerCase()] ?? null };
}

const ENV_KEYS = ["VERCEL", "TRUSTED_IP_HEADER", "TRUST_PROXY"] as const;

// @types/node marks NODE_ENV readonly on ProcessEnv to discourage app code
// from mutating it, but it's an ordinary mutable env var at runtime and
// tests need to flip it. Route the write through an index-signature view
// instead of `any`.
function setNodeEnv(value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = value;
}

describe("getClientIp", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    originalEnv.NODE_ENV = process.env.NODE_ENV;
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
    for (const key of ENV_KEYS) delete process.env[key];
    setNodeEnv("test");
    mockLoggerWarn.mockClear();
  });

  afterEach(() => {
    setNodeEnv(originalEnv.NODE_ENV);
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("trusts x-real-ip when VERCEL=1", async () => {
    process.env.VERCEL = "1";
    const { getClientIp } = await import("@/lib/server/request");
    expect(getClientIp(mockHeaders({ "x-real-ip": "203.0.113.5" }))).toBe(
      "203.0.113.5",
    );
  });

  it("ignores x-real-ip when VERCEL is not set (would be spoofable)", async () => {
    const { getClientIp } = await import("@/lib/server/request");
    expect(getClientIp(mockHeaders({ "x-real-ip": "203.0.113.5" }))).toBe(
      "unknown",
    );
  });

  it("trusts a configured TRUSTED_IP_HEADER", async () => {
    process.env.TRUSTED_IP_HEADER = "cf-connecting-ip";
    const { getClientIp } = await import("@/lib/server/request");
    expect(
      getClientIp(mockHeaders({ "cf-connecting-ip": "198.51.100.7" })),
    ).toBe("198.51.100.7");
  });

  it("trusts the rightmost x-forwarded-for entry when TRUST_PROXY=1", async () => {
    process.env.TRUST_PROXY = "1";
    const { getClientIp } = await import("@/lib/server/request");
    expect(
      getClientIp(
        mockHeaders({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" }),
      ),
    ).toBe("9.10.11.12");
  });

  it("ignores x-forwarded-for when TRUST_PROXY is not set (unspoofable default)", async () => {
    const { getClientIp } = await import("@/lib/server/request");
    expect(getClientIp(mockHeaders({ "x-forwarded-for": "1.2.3.4" }))).toBe(
      "unknown",
    );
  });

  it("returns 'unknown' when no trust source is configured", async () => {
    const { getClientIp } = await import("@/lib/server/request");
    expect(getClientIp(mockHeaders({}))).toBe("unknown");
  });

  it("warns exactly once per process when falling back to unknown in production (Issue 4)", async () => {
    setNodeEnv("production");
    vi.resetModules();
    const { getClientIp } = await import("@/lib/server/request");
    const headers = mockHeaders({});

    expect(getClientIp(headers)).toBe("unknown");
    expect(getClientIp(headers)).toBe("unknown");
    expect(getClientIp(headers)).toBe("unknown");

    expect(mockLoggerWarn).toHaveBeenCalledTimes(1);
    expect(mockLoggerWarn.mock.calls[0]?.[0]).toContain("getClientIp()");
  });

  it("does not warn outside production when falling back to unknown", async () => {
    setNodeEnv("development");
    vi.resetModules();
    const { getClientIp } = await import("@/lib/server/request");
    expect(getClientIp(mockHeaders({}))).toBe("unknown");
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it("does not warn in production when a trust source IS configured", async () => {
    setNodeEnv("production");
    process.env.TRUST_PROXY = "1";
    vi.resetModules();
    const { getClientIp } = await import("@/lib/server/request");
    expect(getClientIp(mockHeaders({ "x-forwarded-for": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });
});
