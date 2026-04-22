/**
 * AES-256-GCM encryption for resume text stored in Firestore.
 *
 * ── Key management ────────────────────────────────────────────────────────
 *
 * The encryption key is read from RESUME_ENCRYPTION_KEY at first use and
 * cached for the lifetime of the process. Generate a key with:
 *
 *   openssl rand -base64 32
 *
 * ── KEY ROTATION WARNING ──────────────────────────────────────────────────
 *
 * Rotating RESUME_ENCRYPTION_KEY is a BREAKING change without a migration.
 * Every ciphertext encrypted with the old key will return `undefined` from
 * decryptResumeText (the AES-GCM auth-tag check will fail), and the error
 * log will read "Failed to decrypt resume text" for all existing sessions.
 *
 * Before rotating the key in production:
 *
 *   1. Read all interview_sessions documents where resumeText starts with
 *      the "enc:v1:" prefix.
 *   2. Decrypt each value with the OLD key.
 *   3. Re-encrypt each value with the NEW key.
 *   4. Write the re-encrypted values back to Firestore.
 *   5. Deploy the new key only after the migration is complete.
 *
 * There is currently no automated migration utility for this. Plan carefully.
 *
 * ── Encryption format ─────────────────────────────────────────────────────
 *
 *   enc:v1:<iv_base64url>:<authtag_base64url>:<ciphertext_base64url>
 *
 * A fresh 12-byte IV is generated for every encryption call, so encrypting
 * the same plaintext twice produces different ciphertexts — this is by design
 * and prevents ciphertext comparison attacks.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { logger } from "@/lib/logger";

const ENCRYPTION_PREFIX = "enc:v1";
const IV_LENGTH = 12;
const KEY_BYTES = 32;
const ALGORITHM = "aes-256-gcm";

let cachedKey: Buffer | undefined;

function parseEncryptionKey(rawKey: string): Buffer {
  const trimmed = rawKey.trim();

  try {
    const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const fromBase64 = Buffer.from(padded, "base64");
    if (fromBase64.length === KEY_BYTES) {
      return fromBase64;
    }
  } catch {
    // Try hex parsing next.
  }

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    const fromHex = Buffer.from(trimmed, "hex");
    if (fromHex.length === KEY_BYTES) {
      return fromHex;
    }
  }

  throw new Error(
    "RESUME_ENCRYPTION_KEY must be a 32-byte key encoded as base64/base64url or 64-char hex.\n" +
      "Generate one with: openssl rand -base64 32",
  );
}

function getEncryptionKey(): Buffer | null {
  if (cachedKey !== undefined) {
    return cachedKey;
  }

  const rawKey = process.env.RESUME_ENCRYPTION_KEY;

  if (!rawKey) {
    logger.warn(
      "[ENV] RESUME_ENCRYPTION_KEY is not set. Resume text will be stored and read in PLAINTEXT. " +
        "This is acceptable only as a temporary measure during env variable rotation. " +
        "Generate a key with: openssl rand -base64 32",
    );
    return null;
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
    // No encryption key configured — return plaintext as a temporary measure.
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
    // No encryption key — cannot decrypt. Return undefined so callers handle gracefully.
    logger.warn(
      "Cannot decrypt resume text: RESUME_ENCRYPTION_KEY is not set.",
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
    // An auth-tag failure most commonly means the ciphertext was encrypted
    // with a different key — the likely cause is an unplanned key rotation.
    // See the KEY ROTATION WARNING at the top of this file for recovery steps.
    logger.error(
      "Failed to decrypt resume text. If RESUME_ENCRYPTION_KEY was recently " +
        "rotated without a data migration, all existing ciphertexts will fail " +
        "with this error. See lib/resume-crypto.ts for migration guidance.",
      error,
    );
    return undefined;
  }
}
