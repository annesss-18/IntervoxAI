import * as cheerio from "cheerio";
import { URL } from "url";
import { extractText } from "unpdf";
import mammoth from "mammoth";
import dns from "node:dns/promises";
import net from "node:net";
import { logger } from "@/lib/logger";

const MAX_RESUME_SIZE_MB = 5;
const MAX_TEXT_LENGTH = 50000;
const ALLOWED_PROTOCOLS = ["http:", "https:"];
const ALLOWED_HTTP_PORTS = new Set(["80", "443"]);
const DNS_REBINDING_CHECK_DELAY_MS = 50;

const BLOCKED_HOSTS = [
  "127.0.0.1",
  "localhost",
  "0.0.0.0",
  "169.254.169.254",
  "::1",
  "metadata.google.internal",
];
const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
];

function isPrivateOrSpecialIPv4(ip: string): boolean {
  const octets = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet)))
    return true;

  const [a, b] = octets as [number, number, number, number];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // Carrier-grade NAT range.
  if (a === 198 && (b === 18 || b === 19)) return true; // Benchmark/test range.
  if (a >= 224) return true; // Multicast and reserved ranges.
  return false;
}

function isPrivateOrSpecialIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("ff")
  );
}

function isPrivateOrLocalhost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(normalizedHost)) return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => normalizedHost.endsWith(suffix)))
    return true;

  const ipVersion = net.isIP(normalizedHost);
  if (ipVersion === 4) return isPrivateOrSpecialIPv4(normalizedHost);
  if (ipVersion === 6) return isPrivateOrSpecialIPv6(normalizedHost);

  return false;
}

function assertAllowedUrlComponents(targetUrl: URL): void {
  if (!ALLOWED_PROTOCOLS.includes(targetUrl.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed.");
  }

  if (targetUrl.username || targetUrl.password) {
    throw new Error("URLs with embedded credentials are not allowed.");
  }

  if (targetUrl.port && !ALLOWED_HTTP_PORTS.has(targetUrl.port)) {
    throw new Error("Only standard HTTP/HTTPS ports are allowed.");
  }
}

async function assertPublicHostname(hostname: string): Promise<void> {
  if (isPrivateOrLocalhost(hostname)) {
    throw new Error("Access to private networks and localhost is not allowed.");
  }

  if (net.isIP(hostname)) return;

  let firstLookup: Array<{ address: string; family: number }>;
  let secondLookup: Array<{ address: string; family: number }>;
  try {
    firstLookup = await dns.lookup(hostname, { all: true, verbatim: true });
    // Perform a second lookup after a short delay to reduce DNS rebinding risk.
    await new Promise((resolve) =>
      setTimeout(resolve, DNS_REBINDING_CHECK_DELAY_MS),
    );
    secondLookup = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error(
      "Unable to resolve hostname. Please provide a reachable public URL.",
    );
  }

  const resolvedAddresses = [...firstLookup, ...secondLookup];

  if (resolvedAddresses.length === 0) {
    throw new Error(
      "Unable to resolve hostname. Please provide a reachable public URL.",
    );
  }

  for (const resolved of resolvedAddresses) {
    if (isPrivateOrLocalhost(resolved.address)) {
      throw new Error(
        "Resolved URL points to a private network and is not allowed.",
      );
    }
  }
}

async function fetchWithSafeRedirects(parsedUrl: URL): Promise<Response> {
  const maxRedirects = 5;
  const deadline = Date.now() + 10000;
  let currentUrl = parsedUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    assertAllowedUrlComponents(currentUrl);
    await assertPublicHostname(currentUrl.hostname);

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new Error(
        "URL request timed out (max 10 seconds). The page may be slow or unreachable.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), remainingMs);

    const response = await fetch(currentUrl.toString(), {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; IntervoxAI/1.0; +https://intervoxai.com)",
      },
    });
    clearTimeout(timeout);

    if (response.status >= 300 && response.status < 400) {
      const locationHeader = response.headers.get("location");
      if (!locationHeader) {
        throw new Error("Redirect response missing location header.");
      }

      const redirectedUrl = new URL(locationHeader, currentUrl);
      assertAllowedUrlComponents(redirectedUrl);

      currentUrl = redirectedUrl;
      continue;
    }

    return response;
  }

  throw new Error("Too many redirects while fetching URL.");
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const result = await extractText(buffer, { mergePages: true });

    let extractedText = result.text;

    extractedText = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim();

    if (!extractedText || extractedText.length < 10) {
      throw new Error(
        "PDF appears to be empty or contains no extractable text. It may be an image-based PDF.",
      );
    }

    return extractedText;
  } catch (error) {
    if (error instanceof Error && error.message.includes("extractable")) {
      throw error;
    }
    logger.error("PDF extraction failed:", error);
    throw new Error(
      "Failed to extract text from PDF. The file may be corrupted, password-protected, or image-based.",
    );
  }
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const { value } = await mammoth.extractRawText({ buffer });
    const extractedText = value
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s+/g, " ")
      .trim();

    if (!extractedText || extractedText.length < 10) {
      throw new Error(
        "DOCX file appears to be empty or contains no extractable text.",
      );
    }

    return extractedText;
  } catch (error) {
    logger.error("DOCX extraction failed:", error);
    throw new Error(
      "Failed to extract text from DOCX. Please save the file as PDF or plain text instead.",
    );
  }
}

export async function extractTextFromFile(
  file: File,
  maxSizeMB: number = MAX_RESUME_SIZE_MB,
): Promise<string> {
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(
      `File size exceeds ${maxSizeMB}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      const pdfMagic = buffer.slice(0, 4).toString();
      if (!pdfMagic.startsWith("%PDF")) {
        throw new Error(
          "File is not a valid PDF. Please upload a genuine PDF file.",
        );
      }

      const text = await extractTextFromPDF(buffer);

      if (text.length > MAX_TEXT_LENGTH) {
        return (
          text.slice(0, MAX_TEXT_LENGTH) +
          "\n\n... (content truncated due to length)"
        );
      }

      return text;
    }

    if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".docx")
    ) {
      const docxMagic = buffer.slice(0, 2).toString();
      if (docxMagic !== "PK") {
        throw new Error(
          "File is not a valid DOCX document. Please upload a genuine DOCX file.",
        );
      }

      const text = await extractTextFromDOCX(buffer);

      if (text.length > MAX_TEXT_LENGTH) {
        return (
          text.slice(0, MAX_TEXT_LENGTH) +
          "\n\n... (content truncated due to length)"
        );
      }

      return text;
    }

    const text = buffer.toString("utf-8");

    if (text.length > MAX_TEXT_LENGTH) {
      return (
        text.slice(0, MAX_TEXT_LENGTH) +
        "\n\n... (content truncated due to length)"
      );
    }

    if (!text.trim()) {
      throw new Error("File appears to be empty.");
    }

    return text;
  } catch (error) {
    logger.error("Error parsing file:", error);

    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      "Failed to extract text from file. Please try a different file or save it as plain text.",
    );
  }
}

async function extractTextWithJina(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: {
        Accept: "text/markdown",
        "X-No-Cache": "true",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Jina Reader returned ${response.status}`);
    }

    let text = await response.text();
    text = text.trim();

    if (!text || text.length < 30) {
      throw new Error("Jina Reader extracted insufficient content");
    }

    if (text.length > 20000) {
      text = text.slice(0, 20000) + "\n\n... (content truncated)";
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function extractTextWithCheerio(url: string): Promise<string> {
  const parsedUrl = new URL(url);
  assertAllowedUrlComponents(parsedUrl);
  await assertPublicHostname(parsedUrl.hostname);

  const response = await fetchWithSafeRedirects(parsedUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch URL: ${response.status} ${response.statusText}`,
    );
  }

  const maxBodyBytes = 500_000;
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable.");
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBodyBytes) {
        reader.cancel();
        throw new Error("Page is too large to process (max 500KB).");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const html = new TextDecoder().decode(Buffer.concat(chunks));

  const $ = cheerio.load(html);

  $("script").remove();
  $("style").remove();
  $("nav").remove();
  $("footer").remove();
  $("header").remove();

  const text = $("body").text().replace(/\s\s+/g, " ").trim();

  if (!text) {
    throw new Error("No content could be extracted from the URL.");
  }

  if (text.length > 20000) {
    return text.slice(0, 20000) + "\n\n... (content truncated)";
  }

  return text;
}

export async function extractTextFromUrl(url: string): Promise<string> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(
      "Invalid URL format. Please provide a valid HTTP or HTTPS URL.",
    );
  }

  // Run SSRF checks before every outbound request path, including Jina Reader.
  assertAllowedUrlComponents(parsedUrl);
  await assertPublicHostname(parsedUrl.hostname);

  // Primary: Jina Reader (handles JS-rendered career sites, no API key needed).
  try {
    const text = await extractTextWithJina(url);
    logger.info("URL extracted via Jina Reader", {
      url,
      length: text.length,
    });
    return text;
  } catch (jinaError) {
    logger.warn(
      "Jina Reader extraction failed, falling back to Cheerio:",
      jinaError,
    );
  }

  // Fallback: Direct fetch + Cheerio (works for server-rendered pages).
  try {
    const text = await extractTextWithCheerio(url);
    logger.info("URL extracted via Cheerio fallback", {
      url,
      length: text.length,
    });
    return text;
  } catch (error) {
    logger.error("Error scraping URL:", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "URL request timed out (max 10 seconds). The page may be slow or unreachable.",
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "Failed to extract text from URL. Please check the URL and try again.",
    );
  }
}
