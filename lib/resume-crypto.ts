import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { logger } from "@/lib/logger";

const ENCRYPTION_PREFIX = "enc:v1";
const IV_LENGTH = 12;
const KEY_BYTES = 32;
const ALGORITHM = "aes-256-gcm";

let cachedKey: Buffer | null | undefined;
let hasLoggedMissingKeyWarning = false;

function parseEncryptionKey(rawKey: string): Buffer {
  const trimmed = rawKey.trim();

  // Prefer base64/base64url for env portability.
  try {
    const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const fromBase64 = Buffer.from(padded, "base64");
    if (fromBase64.length === KEY_BYTES) {
      return fromBase64;
    }
  } catch {
    // Fall back to other formats below.
  }

  // Support hex as fallback for local/dev setups.
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    const fromHex = Buffer.from(trimmed, "hex");
    if (fromHex.length === KEY_BYTES) {
      return fromHex;
    }
  }

  throw new Error(
    "RESUME_ENCRYPTION_KEY must be a 32-byte key encoded as base64/base64url or 64-char hex.",
  );
}

function getEncryptionKey(): Buffer | null {
  if (cachedKey !== undefined) {
    return cachedKey;
  }

  const rawKey = process.env.RESUME_ENCRYPTION_KEY;
  if (!rawKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESUME_ENCRYPTION_KEY is required in production. Resume text cannot be stored in plaintext.",
      );
    }
    cachedKey = null;
    if (!hasLoggedMissingKeyWarning) {
      logger.warn(
        "RESUME_ENCRYPTION_KEY is not set. Resume text will be stored in plaintext until configured.",
      );
      hasLoggedMissingKeyWarning = true;
    }
    return cachedKey;
  }

  cachedKey = parseEncryptionKey(rawKey);
  return cachedKey;
}

export function isEncryptedResumeText(value: string): boolean {
  return value.startsWith(`${ENCRYPTION_PREFIX}:`);
}

export function encryptResumeText(plaintext: string): string {
  if (!plaintext) {
    return plaintext;
  }

  if (isEncryptedResumeText(plaintext)) {
    return plaintext;
  }

  const key = getEncryptionKey();
  if (!key) {
    return plaintext;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}:${iv.toString("base64url")}:${authTag.toString(
    "base64url",
  )}:${encrypted.toString("base64url")}`;
}

export function decryptResumeText(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  if (!isEncryptedResumeText(value)) {
    return value;
  }

  const key = getEncryptionKey();
  if (!key) {
    logger.error(
      "Encrypted resume text found but RESUME_ENCRYPTION_KEY is missing.",
    );
    return undefined;
  }

  const [prefix, version, ivB64, tagB64, payloadB64] = value.split(":");
  if (
    prefix !== "enc" ||
    version !== "v1" ||
    !ivB64 ||
    !tagB64 ||
    !payloadB64
  ) {
    logger.error("Encrypted resume text has invalid format.");
    return undefined;
  }

  try {
    const iv = Buffer.from(ivB64, "base64url");
    const authTag = Buffer.from(tagB64, "base64url");
    const payload = Buffer.from(payloadB64, "base64url");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(payload),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (error) {
    logger.error("Failed to decrypt resume text:", error);
    return undefined;
  }
}
