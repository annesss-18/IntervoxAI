// lib/server-utils.ts
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
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark/testing
  if (a >= 224) return true; // multicast/reserved
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

/**
 * Extract text from PDF using the unpdf library
 * This provides reliable extraction including compressed streams and encoded fonts
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Use unpdf for reliable text extraction with merged pages
    const result = await extractText(buffer, { mergePages: true });

    // With mergePages: true, result.text is a single string
    let extractedText = result.text;

    // Clean up the extracted text
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

/**
 * Extract text from DOCX file
 * DOCX is essentially a ZIP file containing XML
 */
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

    // Handle PDF files
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

    // Handle DOCX files
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

    // Handle plain text files
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

export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error(
        "Invalid URL format. Please provide a valid HTTP or HTTPS URL.",
      );
    }

    assertAllowedUrlComponents(parsedUrl);
    await assertPublicHostname(parsedUrl.hostname);
    const response = await fetchWithSafeRedirects(parsedUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch URL: ${response.status} ${response.statusText}`,
      );
    }

    const html = await response.text();

    if (html.length > 500000) {
      throw new Error("Page is too large to process (max 500KB).");
    }

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
