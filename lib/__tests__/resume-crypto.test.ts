import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_KEY_BASE64 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetModules();
  process.env.RESUME_ENCRYPTION_KEY = TEST_KEY_BASE64;
});

afterEach(() => {
  delete process.env.RESUME_ENCRYPTION_KEY;
  vi.restoreAllMocks();
});

async function getCrypto() {
  return await import("../resume-crypto");
}

describe("encryptResumeText / decryptResumeText", () => {
  it("round-trips plaintext correctly", async () => {
    const { encryptResumeText, decryptResumeText } = await getCrypto();
    const plaintext = "John Doe\nSenior Engineer at ACME\njohn@example.com";
    const encrypted = encryptResumeText(plaintext);

    expect(decryptResumeText(encrypted)).toBe(plaintext);
  });

  it("produces ciphertext with the enc:v1 prefix", async () => {
    const { encryptResumeText } = await getCrypto();
    const encrypted = encryptResumeText("hello");

    expect(encrypted).toMatch(/^enc:v1:/);
  });

  it("is idempotent and does not double-encrypt", async () => {
    const { encryptResumeText } = await getCrypto();
    const once = encryptResumeText("test resume");
    const twice = encryptResumeText(once);

    expect(once).toBe(twice);
  });

  it("each call produces a unique ciphertext", async () => {
    const { encryptResumeText, decryptResumeText } = await getCrypto();
    const first = encryptResumeText("same plaintext");
    const second = encryptResumeText("same plaintext");

    expect(first).not.toBe(second);
    expect(decryptResumeText(first)).toBe("same plaintext");
    expect(decryptResumeText(second)).toBe("same plaintext");
  });

  it("returns undefined when the auth tag is tampered", async () => {
    const { encryptResumeText, decryptResumeText } = await getCrypto();
    const encrypted = encryptResumeText("sensitive resume data");
    const tampered = encrypted.slice(0, -5) + "XXXXX";

    expect(decryptResumeText(tampered)).toBeUndefined();
  });

  it("returns undefined for malformed enc:v1 strings", async () => {
    const { decryptResumeText } = await getCrypto();

    expect(decryptResumeText("enc:v1:only-two-parts")).toBeUndefined();
  });

  it("passes through non-encrypted strings unchanged", async () => {
    const { decryptResumeText } = await getCrypto();

    expect(decryptResumeText("just plain text")).toBe("just plain text");
  });

  it("throws when the encryption key is missing", async () => {
    delete process.env.RESUME_ENCRYPTION_KEY;

    const { encryptResumeText, decryptResumeText } = await getCrypto();

    expect(() => encryptResumeText("hello")).toThrow(
      /RESUME_ENCRYPTION_KEY is not set/i,
    );
    expect(() => decryptResumeText("enc:v1:aaa:bbb:ccc")).toThrow(
      /RESUME_ENCRYPTION_KEY is not set/i,
    );
  });
});

describe("isEncryptedResumeText", () => {
  it("correctly identifies encrypted strings", async () => {
    const { encryptResumeText, isEncryptedResumeText } = await getCrypto();
    const encrypted = encryptResumeText("hello");

    expect(isEncryptedResumeText(encrypted)).toBe(true);
  });

  it("correctly identifies plaintext strings", async () => {
    const { isEncryptedResumeText } = await getCrypto();

    expect(isEncryptedResumeText("plain text")).toBe(false);
    expect(isEncryptedResumeText("")).toBe(false);
  });
});
