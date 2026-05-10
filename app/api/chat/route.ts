/**
 * Chat API Route
 * 
 * POST /api/chat
 * Accepts { query: string, documentId?: string }
 * 
 * RAG retrieval + generation pipeline:
 *   1. Embed the user query
 *   2. Search Qdrant for top-K similar chunks
 *   3. Send context + query to Gemini for grounded answer generation
 *   4. Stream the response back to the client
 */

import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { searchSimilar } from "@/lib/vectorStore";
import { generateAnswer } from "@/lib/llm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, documentId } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Please provide a question." },
        { status: 400 }
      );
    }

    // Step 1: Embed the query
    const queryEmbedding = await embedText(query.trim());

    // Step 2: Search for relevant chunks
    const relevantChunks = await searchSimilar(
      queryEmbedding,
      documentId || undefined,
      5
    );

    if (relevantChunks.length === 0) {
      return NextResponse.json(
        {
          error:
            "No relevant information found. Please upload a document first or try a different question.",
        },
        { status: 404 }
      );
    }

    // Step 3: Generate grounded answer with streaming
    const stream = await generateAnswer(query.trim(), relevantChunks);

    // Return streaming response with source chunks in headers
    const sourcesHeader = JSON.stringify(
      relevantChunks.map((chunk) => ({
        text: chunk.text.substring(0, 150) + (chunk.text.length > 150 ? "..." : ""),
        score: Math.round(chunk.score * 100) / 100,
        chunkIndex: chunk.metadata.chunkIndex,
        totalChunks: chunk.metadata.totalChunks,
        documentName: chunk.metadata.documentName,
      }))
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Sources": encodeURIComponent(sourcesHeader),
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while generating the answer.",
      },
      { status: 500 }
    );
  }
}
