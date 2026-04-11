// Test the in-memory rate limiter path without requiring Upstash.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Force Redis to appear unconfigured so we test the in-memory path.
vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

vi.mock("@/lib/logger", () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe("checkRateLimit (in-memory fallback)", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it("allows requests up to the limit", async () => {
        const { checkRateLimit } = await import("../rate-limit");
        const config = { maxRequests: 3, windowMs: 60_000 };

        const r1 = await checkRateLimit("user-A:POST:/api/test", config);
        const r2 = await checkRateLimit("user-A:POST:/api/test", config);
        const r3 = await checkRateLimit("user-A:POST:/api/test", config);

        expect(r1.allowed).toBe(true);
        expect(r2.allowed).toBe(true);
        expect(r3.allowed).toBe(true);
    });

    it("blocks the request that exceeds the limit", async () => {
        const { checkRateLimit } = await import("../rate-limit");
        const config = { maxRequests: 2, windowMs: 60_000 };

        await checkRateLimit("user-B:POST:/api/test", config);
        await checkRateLimit("user-B:POST:/api/test", config);
        const over = await checkRateLimit("user-B:POST:/api/test", config);

        expect(over.allowed).toBe(false);
        expect(over.remaining).toBe(0);
    });

    it("does not share limits between different identifiers", async () => {
        const { checkRateLimit } = await import("../rate-limit");
        const config = { maxRequests: 1, windowMs: 60_000 };

        const a = await checkRateLimit("user-C:POST:/api/test", config);
        const b = await checkRateLimit("user-D:POST:/api/test", config); // different user

        expect(a.allowed).toBe(true);
        expect(b.allowed).toBe(true); // independent bucket
    });

    it("resets after the window expires", async () => {
        const { checkRateLimit } = await import("../rate-limit");
        const config = { maxRequests: 1, windowMs: 50 }; // 50 ms window

        await checkRateLimit("user-E:POST:/api/test", config);
        const blocked = await checkRateLimit("user-E:POST:/api/test", config);
        expect(blocked.allowed).toBe(false);

        // Wait for the window to expire
        await new Promise((r) => setTimeout(r, 60));

        const allowed = await checkRateLimit("user-E:POST:/api/test", config);
        expect(allowed.allowed).toBe(true);
    });
});
