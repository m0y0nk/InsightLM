"use client";

interface Source {
  text: string;
  score: number;
  chunkIndex: number;
  totalChunks: number;
  documentName: string;
}

interface SourceChipsProps {
  sources: Source[];
}

export default function SourceChips({ sources }: SourceChipsProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="sources-container">
      <div className="sources-label">📎 Sources</div>
      {sources.map((source, index) => (
        <span
          key={index}
          className="source-chip"
          title={source.text}
        >
          <span>
            Chunk {source.chunkIndex + 1}/{source.totalChunks}
          </span>
          <span className="source-chip-score">
            {Math.round(source.score * 100)}%
          </span>
        </span>
      ))}
    </div>
  );
}
