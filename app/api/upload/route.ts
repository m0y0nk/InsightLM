/**
 * Document Upload API Route
 * 
 * POST /api/upload
 * Accepts multipart/form-data with a file field.
 * Processes the document through the full RAG ingestion pipeline:
 *   1. Parse (PDF/TXT extraction)
 *   2. Chunk (recursive text splitting)
 *   3. Embed (Gemini text-embedding-004)
 *   4. Store (Qdrant Cloud)
 */

import { NextRequest, NextResponse } from "next/server";
import { parseDocument } from "@/lib/pdfParser";
import { chunkText } from "@/lib/chunker";
import { embedTexts } from "@/lib/embeddings";
import { upsertChunks } from "@/lib/vectorStore";
import { v4 as uuidv4 } from "uuid";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Please upload a PDF or TXT file." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "text/markdown",
    ];
    const isAllowedType =
      allowedTypes.includes(file.type) ||
      file.name.toLowerCase().endsWith(".pdf") ||
      file.name.toLowerCase().endsWith(".txt") ||
      file.name.toLowerCase().endsWith(".md");

    if (!isAllowedType) {
      return NextResponse.json(
        { error: "Unsupported file type. Only PDF and TXT files are accepted." },
        { status: 400 }
      );
    }

    // Step 1: Parse the document
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDocument(buffer, file.name, file.type);

    if (!parsed.text || parsed.text.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract any text from the file. The file may be empty or contain only images." },
        { status: 400 }
      );
    }

    // Step 2: Chunk the text
    const documentId = uuidv4();
    const chunks = chunkText(parsed.text, documentId, file.name);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No text chunks could be generated from the document." },
        { status: 400 }
      );
    }

    // Step 3: Embed all chunks
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await embedTexts(chunkTexts);

    // Step 4: Store in Qdrant
    await upsertChunks(chunks, embeddings);

    return NextResponse.json({
      success: true,
      documentId,
      fileName: file.name,
      chunkCount: chunks.length,
      charCount: parsed.metadata.charCount,
      pageCount: parsed.metadata.pageCount,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during upload.",
      },
      { status: 500 }
    );
  }
}
