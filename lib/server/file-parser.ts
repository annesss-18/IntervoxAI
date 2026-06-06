import { extractText } from "unpdf";
import mammoth from "mammoth";
import { logger } from "@/lib/logger";
import { PDF_MIME, DOCX_MIME } from "@/lib/resume";

const MAX_RESUME_SIZE_MB = 5;
const MAX_TEXT_LENGTH = 50000;

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

    if (file.type === PDF_MIME || file.name.toLowerCase().endsWith(".pdf")) {
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

    if (file.type === DOCX_MIME || file.name.toLowerCase().endsWith(".docx")) {
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
