/**
 * Recursive Character Text Splitter
 * 
 * Chunking Strategy: Recursive splitting with overlap.
 * 
 * This chunker attempts to split text while preserving semantic boundaries.
 * It tries separators in order of preference:
 *   1. Double newlines (paragraph breaks)
 *   2. Single newlines (line breaks)
 *   3. Periods followed by space (sentence endings)
 *   4. Spaces (word boundaries)
 *   5. Empty string (character-level, last resort)
 * 
 * Parameters:
 *   - chunkSize: Maximum characters per chunk (default: 500)
 *   - chunkOverlap: Characters of overlap between consecutive chunks (default: 50)
 * 
 * Each chunk includes metadata: documentId, chunkIndex, documentName, totalChunks.
 */

export interface ChunkMetadata {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  totalChunks: number;
}

export interface TextChunk {
  text: string;
  metadata: ChunkMetadata;
}

const DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " ", ""];
const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_CHUNK_OVERLAP = 50;

/**
 * Splits text using the first separator that produces sub-parts.
 * Falls back to the next separator if the current one doesn't split anything.
 */
function splitOnSeparator(text: string, separator: string): string[] {
  if (separator === "") {
    return text.split("");
  }
  return text.split(separator);
}

/**
 * Merges small text pieces into chunks that respect the chunk size limit.
 * Adds overlap from the end of the previous chunk to the beginning of the next.
 */
function mergeSplits(
  splits: string[],
  separator: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const split of splits) {
    const splitLen = split.length;
    const sepLen = currentChunk.length > 0 ? separator.length : 0;

    // If adding this split would exceed chunk size, finalize the current chunk
    if (currentLength + splitLen + sepLen > chunkSize && currentChunk.length > 0) {
      const chunk = currentChunk.join(separator).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Keep overlap from the end of the current chunk
      while (
        currentChunk.length > 0 &&
        currentLength > chunkOverlap
      ) {
        const removed = currentChunk.shift();
        if (removed) {
          currentLength -= removed.length + (currentChunk.length > 0 ? separator.length : 0);
        }
      }
    }

    currentChunk.push(split);
    currentLength += splitLen + sepLen;
  }

  // Add the last chunk
  const lastChunk = currentChunk.join(separator).trim();
  if (lastChunk.length > 0) {
    chunks.push(lastChunk);
  }

  return chunks;
}

/**
 * Recursively splits text using a hierarchy of separators.
 * Tries the most semantically meaningful separator first (paragraph breaks),
 * falling back to less meaningful ones (character-level) as needed.
 */
function recursiveSplit(
  text: string,
  separators: string[],
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const finalChunks: string[] = [];

  // Find the best separator (first one that actually splits the text)
  let bestSeparator = separators[separators.length - 1];
  let bestSepIndex = separators.length - 1;

  for (let i = 0; i < separators.length; i++) {
    if (separators[i] === "") {
      bestSeparator = separators[i];
      bestSepIndex = i;
      break;
    }
    if (text.includes(separators[i])) {
      bestSeparator = separators[i];
      bestSepIndex = i;
      break;
    }
  }

  // Split text on the best separator
  const splits = splitOnSeparator(text, bestSeparator);

  // For each split, check if it's small enough or needs further splitting
  const goodSplits: string[] = [];
  const remainingSeparators = separators.slice(bestSepIndex + 1);

  for (const split of splits) {
    if (split.length <= chunkSize) {
      goodSplits.push(split);
    } else {
      // First, merge any accumulated good splits
      if (goodSplits.length > 0) {
        const merged = mergeSplits(goodSplits, bestSeparator, chunkSize, chunkOverlap);
        finalChunks.push(...merged);
        goodSplits.length = 0;
      }

      // Recursively split the oversized piece
      if (remainingSeparators.length > 0) {
        const subChunks = recursiveSplit(split, remainingSeparators, chunkSize, chunkOverlap);
        finalChunks.push(...subChunks);
      } else {
        // Last resort: just add it even if it's too big
        finalChunks.push(split);
      }
    }
  }

  // Merge any remaining good splits
  if (goodSplits.length > 0) {
    const merged = mergeSplits(goodSplits, bestSeparator, chunkSize, chunkOverlap);
    finalChunks.push(...merged);
  }

  return finalChunks;
}

/**
 * Main chunking function. Takes raw text and document metadata,
 * returns an array of TextChunk objects ready for embedding.
 */
export function chunkText(
  text: string,
  documentId: string,
  documentName: string,
  options?: {
    chunkSize?: number;
    chunkOverlap?: number;
    separators?: string[];
  }
): TextChunk[] {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
  const separators = options?.separators ?? DEFAULT_SEPARATORS;

  // Clean the text
  const cleanedText = text.replace(/\r\n/g, "\n").trim();

  if (cleanedText.length === 0) {
    return [];
  }

  // If text is small enough, return as single chunk
  if (cleanedText.length <= chunkSize) {
    return [
      {
        text: cleanedText,
        metadata: {
          documentId,
          documentName,
          chunkIndex: 0,
          totalChunks: 1,
        },
      },
    ];
  }

  // Recursively split the text
  const rawChunks = recursiveSplit(cleanedText, separators, chunkSize, chunkOverlap);

  // Filter out empty chunks and add metadata
  const chunks: TextChunk[] = rawChunks
    .filter((chunk) => chunk.trim().length > 0)
    .map((chunk, index, arr) => ({
      text: chunk.trim(),
      metadata: {
        documentId,
        documentName,
        chunkIndex: index,
        totalChunks: arr.length,
      },
    }));

  return chunks;
}
