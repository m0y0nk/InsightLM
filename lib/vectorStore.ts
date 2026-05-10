/**
 * Qdrant Vector Store Client
 * 
 * Manages vector storage and retrieval using Qdrant Cloud.
 * Handles collection creation, upserting document chunks, 
 * similarity search, and document deletion.
 */

import { QdrantClient } from "@qdrant/js-client-rest";
import { EMBEDDING_DIMENSION } from "./embeddings";
import type { ChunkMetadata } from "./chunker";

const COLLECTION_NAME = "documents";
const DEFAULT_TOP_K = 5;

let client: QdrantClient | null = null;

function getClient(): QdrantClient {
  if (!client) {
    const url = process.env.QDRANT_URL;
    const apiKey = process.env.QDRANT_API_KEY;

    if (!url || !apiKey) {
      throw new Error(
        "QDRANT_URL and QDRANT_API_KEY environment variables must be set."
      );
    }

    client = new QdrantClient({ url, apiKey });
  }
  return client;
}

/**
 * Ensures the documents collection exists in Qdrant.
 * Creates it if it doesn't exist.
 */
export async function ensureCollection(): Promise<void> {
  const qdrant = getClient();

  try {
    await qdrant.getCollection(COLLECTION_NAME);
  } catch {
    // Collection doesn't exist, create it
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: EMBEDDING_DIMENSION,
        distance: "Cosine",
      },
    });

    // Create payload index for efficient filtering by documentId
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: "documentId",
      field_schema: "keyword",
    });
  }
}

/**
 * Upserts document chunks into Qdrant.
 * Each point contains the embedding vector and chunk metadata as payload.
 */
export async function upsertChunks(
  chunks: { text: string; metadata: ChunkMetadata }[],
  embeddings: number[][]
): Promise<void> {
  const qdrant = getClient();
  await ensureCollection();

  const points = chunks.map((chunk, index) => ({
    id: crypto.randomUUID(),
    vector: embeddings[index],
    payload: {
      text: chunk.text,
      documentId: chunk.metadata.documentId,
      documentName: chunk.metadata.documentName,
      chunkIndex: chunk.metadata.chunkIndex,
      totalChunks: chunk.metadata.totalChunks,
    },
  }));

  // Upsert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    const batch = points.slice(i, i + BATCH_SIZE);
    await qdrant.upsert(COLLECTION_NAME, { points: batch });
  }
}

export interface SearchResult {
  text: string;
  score: number;
  metadata: ChunkMetadata;
}

/**
 * Searches for the most relevant chunks to a query.
 * Optionally filters by documentId to scope the search to a specific document.
 */
export async function searchSimilar(
  queryEmbedding: number[],
  documentId?: string,
  topK: number = DEFAULT_TOP_K
): Promise<SearchResult[]> {
  const qdrant = getClient();
  await ensureCollection();

  const filter = documentId
    ? {
        must: [
          {
            key: "documentId",
            match: { value: documentId },
          },
        ],
      }
    : undefined;

  const results = await qdrant.search(COLLECTION_NAME, {
    vector: queryEmbedding,
    limit: topK,
    filter,
    with_payload: true,
  });

  return results.map((result) => ({
    text: (result.payload?.text as string) || "",
    score: result.score,
    metadata: {
      documentId: (result.payload?.documentId as string) || "",
      documentName: (result.payload?.documentName as string) || "",
      chunkIndex: (result.payload?.chunkIndex as number) || 0,
      totalChunks: (result.payload?.totalChunks as number) || 0,
    },
  }));
}

/**
 * Deletes all chunks belonging to a specific document from Qdrant.
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const qdrant = getClient();
  await ensureCollection();

  await qdrant.delete(COLLECTION_NAME, {
    filter: {
      must: [
        {
          key: "documentId",
          match: { value: documentId },
        },
      ],
    },
  });
}

/**
 * Retrieves a list of all unique documents stored in Qdrant.
 * Returns document metadata by scrolling through the collection.
 */
export async function listDocuments(): Promise<
  { documentId: string; documentName: string; totalChunks: number }[]
> {
  const qdrant = getClient();
  await ensureCollection();

  // Scroll through all points to get unique documents
  const result = await qdrant.scroll(COLLECTION_NAME, {
    limit: 1000,
    with_payload: true,
    with_vector: false,
  });

  const documentMap = new Map<
    string,
    { documentId: string; documentName: string; totalChunks: number }
  >();

  for (const point of result.points) {
    const docId = point.payload?.documentId as string;
    if (docId && !documentMap.has(docId)) {
      documentMap.set(docId, {
        documentId: docId,
        documentName: (point.payload?.documentName as string) || "Unknown",
        totalChunks: (point.payload?.totalChunks as number) || 0,
      });
    }
  }

  return Array.from(documentMap.values());
}
