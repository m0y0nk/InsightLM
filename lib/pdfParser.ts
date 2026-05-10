/**
 * PDF and Text File Parser
 * 
 * Extracts raw text from uploaded PDF and TXT files.
 * Uses `pdf-parse` (v2) for PDF extraction.
 */

import { PDFParse } from "pdf-parse";

export interface ParsedDocument {
  text: string;
  metadata: {
    fileName: string;
    fileType: string;
    pageCount?: number;
    charCount: number;
  };
}

/**
 * Extracts text from a PDF buffer.
 */
async function parsePDF(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
  const pdf = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await pdf.getText();

  return {
    text: result.text.trim(),
    metadata: {
      fileName,
      fileType: "pdf",
      pageCount: result.total,
      charCount: result.text.length,
    },
  };
}

/**
 * Extracts text from a plain text buffer.
 */
function parseText(buffer: Buffer, fileName: string): ParsedDocument {
  const text = new TextDecoder("utf-8").decode(buffer);

  return {
    text,
    metadata: {
      fileName,
      fileType: "txt",
      charCount: text.length,
    },
  };
}

/**
 * Parses an uploaded file (PDF or TXT) and returns extracted text.
 * Throws an error for unsupported file types.
 */
export async function parseDocument(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ParsedDocument> {
  if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    return parsePDF(buffer, fileName);
  }

  if (
    mimeType === "text/plain" ||
    fileName.toLowerCase().endsWith(".txt") ||
    fileName.toLowerCase().endsWith(".md")
  ) {
    return parseText(buffer, fileName);
  }

  throw new Error(
    `Unsupported file type: ${mimeType}. Only PDF and TXT files are supported.`
  );
}
