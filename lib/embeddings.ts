/**
 * Google Gemini Embedding Wrapper
 * 
 * Uses the `text-embedding-004` model to generate 768-dimensional embeddings.
 * Supports both single-text and batch embedding for efficient document processing.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const EMBEDDING_MODEL = "gemini-embedding-2";
const BATCH_SIZE = 20; // Gemini supports batching

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
 * Generates an embedding vector for a single text string.
 */
export async function embedText(text: string): Promise<number[]> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Generates embedding vectors for multiple texts in batches.
 * Processes in batches of BATCH_SIZE to avoid rate limits.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL });
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const result = await model.batchEmbedContents({
      requests: batch.map((text) => ({
        content: { parts: [{ text }], role: "user" },
      })),
    });

    allEmbeddings.push(...result.embeddings.map((e) => e.values));

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return allEmbeddings;
}

/** The dimensionality of the embedding vectors */
export const EMBEDDING_DIMENSION = 3072;
