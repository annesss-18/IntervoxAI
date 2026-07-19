import * as cheerio from "cheerio";
import { logger } from "@/lib/logger";
import {
  assertAllowedUrlComponents,
  assertPublicHostname,
  fetchWithSafeRedirects,
} from "@/lib/server/ssrf-guard";

function getJobUrlReaderProvider(): "jina" | "direct" {
  // Jina Reader is opt-in — it forwards user-submitted URLs to a third-party
  // service (r.jina.ai). Default to "direct" for privacy.
  return process.env.JOB_URL_READER_PROVIDER?.trim().toLowerCase() === "jina"
    ? "jina"
    : "direct";
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

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Failed to fetch URL: ${response.status} ${response.statusText}`,
    );
  }

  // fetchWithSafeRedirects enforces the byte limit while pinning the TCP
  // connection to a validated public address.
  const html = new TextDecoder().decode(response.body);

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
  if (getJobUrlReaderProvider() === "jina") {
    try {
      const text = await extractTextWithJina(url);
      logger.info("URL extracted via Jina Reader", {
        host: parsedUrl.hostname,
        length: text.length,
      });
      return text;
    } catch (jinaError) {
      logger.warn(
        "Jina Reader extraction failed, falling back to Cheerio:",
        jinaError,
      );
    }
  }

  // Fallback: Direct fetch + Cheerio (works for server-rendered pages).
  try {
    const text = await extractTextWithCheerio(url);
    logger.info("URL extracted via Cheerio fallback", {
      host: parsedUrl.hostname,
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
