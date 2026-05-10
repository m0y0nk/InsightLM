/**
 * PDF and Text File Parser
 * 
 * Extracts raw text from uploaded PDF and TXT files.
 * Uses `pdf-parse` (v2) for PDF extraction.
 */

let PDFParse: any;

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
  // Polyfill DOMMatrix for Next.js Turbopack Node.js runtime
  if (typeof global !== "undefined" && typeof global.DOMMatrix === "undefined") {
    // pdfjs-dist requires DOMMatrix to be defined
    global.DOMMatrix = class DOMMatrix {} as any;
  }

  if (!PDFParse) {
    const pdfParseModule = await import("pdf-parse");
    PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse || pdfParseModule.default;
  }

  // Create an instance using PDFParse class if available, otherwise just use the exported function if it's pdf-parse v1
  let text = "";
  let total = 0;
  
  if (typeof PDFParse === "function" && !PDFParse.prototype?.getText) {
    // Fallback for pdf-parse v1.x behavior if needed
    const result = await PDFParse(buffer);
    text = result.text;
    total = result.numpages;
  } else {
    const pdf = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await pdf.getText();
    text = result.text;
    total = result.total;
  }

  return {
    text: text.trim(),
    metadata: {
      fileName,
      fileType: "pdf",
      pageCount: total,
      charCount: text.length,
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
