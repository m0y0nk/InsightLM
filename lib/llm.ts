/**
 * Google Gemini LLM Wrapper
 * 
 * Handles grounded answer generation using retrieved document context.
 * The system prompt enforces that answers come ONLY from the provided context,
 * preventing hallucination from the model's general knowledge.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { SearchResult } from "./vectorStore";

const GENERATION_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a document Q&A assistant called DocChat. Your ONLY job is to answer questions using the provided document context.

STRICT RULES:
1. ONLY answer using information found in the provided context chunks below.
2. If the answer is NOT in the provided context, respond with: "I couldn't find information about this in the uploaded document. Try rephrasing your question or uploading a document that covers this topic."
3. Do NOT use your general knowledge or training data to answer.
4. When answering, naturally reference which part of the document your answer comes from.
5. Be concise but thorough. Use bullet points or numbered lists when appropriate.
6. If the context is ambiguous, acknowledge the ambiguity.
7. Format your responses using Markdown for readability.`;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Formats retrieved chunks into a context string for the LLM prompt.
 */
function formatContext(chunks: SearchResult[]): string {
  return chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1} — "${chunk.metadata.documentName}", Chunk ${chunk.metadata.chunkIndex + 1}/${chunk.metadata.totalChunks}]\n${chunk.text}`
    )
    .join("\n\n---\n\n");
}

/**
 * Generates a grounded answer using retrieved context chunks.
 * Returns a ReadableStream for streaming the response to the client.
 */
export async function generateAnswer(
  query: string,
  relevantChunks: SearchResult[]
): Promise<ReadableStream<Uint8Array>> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: GENERATION_MODEL,
    systemInstruction: SYSTEM_PROMPT,
  });

  const context = formatContext(relevantChunks);

  const prompt = `Based on the following document context, answer the user's question.

DOCUMENT CONTEXT:
${context}

USER QUESTION: ${query}

Remember: Only answer from the provided context. If the information isn't there, say so.`;

  const result = await model.generateContentStream(prompt);

  // Convert the Gemini stream to a web-standard ReadableStream
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return stream;
}

/**
 * Generates a non-streaming answer (for simpler use cases).
 */
export async function generateAnswerSync(
  query: string,
  relevantChunks: SearchResult[]
): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: GENERATION_MODEL,
    systemInstruction: SYSTEM_PROMPT,
  });

  const context = formatContext(relevantChunks);

  const prompt = `Based on the following document context, answer the user's question.

DOCUMENT CONTEXT:
${context}

USER QUESTION: ${query}

Remember: Only answer from the provided context. If the information isn't there, say so.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
