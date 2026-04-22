// Exercise the public SSRF guards without making real DNS calls.

import { beforeEach, describe, expect, it, vi } from "vitest";
import dns from "node:dns/promises";

vi.mock("node:dns/promises", () => ({
  default: {
    lookup: vi.fn(),
  },
}));

// Test the SSRF checks through extractTextFromUrl rather than internal helpers.
describe("SSRF: extractTextFromUrl blocks private addresses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const privateHosts = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "10.0.0.1",
    "192.168.1.1",
    "172.16.0.1",
    "172.31.255.255",
    "169.254.169.254",
    "::1",
    "metadata.google.internal",
    "anything.localhost",
    "internal.service.local",
  ];

  privateHosts.forEach((host) => {
    it(`rejects ${host}`, async () => {
      const { extractTextFromUrl } = await import("../server-utils");
      await expect(
        extractTextFromUrl(`http://${host}/jobs/123`),
      ).rejects.toThrow();
    });
  });

  it("rejects non-http protocols", async () => {
    const { extractTextFromUrl } = await import("../server-utils");
    await expect(extractTextFromUrl("file:///etc/passwd")).rejects.toThrow();
    await expect(
      extractTextFromUrl("ftp://example.com/file"),
    ).rejects.toThrow();
  });

  it("rejects URLs with credentials", async () => {
    const { extractTextFromUrl } = await import("../server-utils");
    await expect(
      extractTextFromUrl("http://user:pass@example.com/jobs"),
    ).rejects.toThrow();
  });

  it("rejects non-standard ports", async () => {
    const { extractTextFromUrl } = await import("../server-utils");
    await expect(
      extractTextFromUrl("http://example.com:8080/jobs"),
    ).rejects.toThrow();
  });

  it("rejects when DNS resolves to a private IP (DNS rebinding)", async () => {
    const { extractTextFromUrl } = await import("../server-utils");

    vi.mocked(dns.lookup).mockResolvedValue([
      { address: "192.168.1.100", family: 4 },
    ] as unknown as Awaited<ReturnType<typeof dns.lookup>>);

    await expect(
      extractTextFromUrl("http://evil-rebind.com/jobs"),
    ).rejects.toThrow(/private network/i);
  });
});
