import { afterEach, describe, expect, it, vi } from "vitest";

const testEnv = process.env as Record<string, string | undefined>;
const originalNodeEnv = testEnv.NODE_ENV;

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    if (originalNodeEnv === undefined) {
      delete testEnv.NODE_ENV;
    } else {
      testEnv.NODE_ENV = originalNodeEnv;
    }
  });

  it("emits production audit logs with sensitive fields redacted", async () => {
    testEnv.NODE_ENV = "production";
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const { logger } = await import("../logger");

    logger.audit("job_url.failed", {
      url: "https://example.com/jobs?id=123&token=secret#apply",
      apiKey: "secret-api-key",
      nested: {
        session: "session-cookie",
      },
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(infoSpy.mock.calls[0]![0] as string);

    expect(entry).toMatchObject({
      level: "audit",
      event: "job_url.failed",
      url: "https://example.com/jobs?redacted#redacted",
      apiKey: "[redacted]",
      nested: {
        session: "[redacted]",
      },
    });
  });

  it("emits ordinary info logs in production at default log level", async () => {
    testEnv.NODE_ENV = "production";
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const { logger } = await import("../logger");
    logger.info("ordinary event");

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(infoSpy.mock.calls[0]![0] as string);
    expect(entry).toMatchObject({
      level: "info",
      message: "ordinary event",
    });
  });
});
