"use client";

interface DocumentInfo {
  documentId: string;
  documentName: string;
  totalChunks: number;
}

interface DocumentListProps {
  documents: DocumentInfo[];
  activeDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
  onDeleteDocument: (documentId: string) => void;
}

export default function DocumentList({
  documents,
  activeDocumentId,
  onSelectDocument,
  onDeleteDocument,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="no-documents">
        <div className="no-documents-icon">📂</div>
        <p>No documents uploaded yet.</p>
        <p>Upload a PDF or TXT to get started.</p>
      </div>
    );
  }

  const getFileIcon = (name: string) => {
    if (name.toLowerCase().endsWith(".pdf")) return "📕";
    if (name.toLowerCase().endsWith(".md")) return "📘";
    return "📝";
  };

  return (
    <div>
      <div className="document-list-title">Your Documents</div>
      {documents.map((doc) => (
        <div
          key={doc.documentId}
          className={`document-item ${
            activeDocumentId === doc.documentId ? "active" : ""
          }`}
          onClick={() => onSelectDocument(doc.documentId)}
          id={`doc-${doc.documentId}`}
        >
          <div className="document-item-icon">
            {getFileIcon(doc.documentName)}
          </div>
          <div className="document-item-info">
            <div className="document-item-name">{doc.documentName}</div>
            <div className="document-item-meta">
              {doc.totalChunks} chunks
            </div>
          </div>
          <button
            className="document-item-delete"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteDocument(doc.documentId);
            }}
            title="Delete document"
            aria-label={`Delete ${doc.documentName}`}
            id={`delete-${doc.documentId}`}
          >
            🗑️
          </button>
        </div>
      ))}
    </div>
  );
}
