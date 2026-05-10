"use client";

import { useState, useEffect, useCallback } from "react";
import DocumentUploader from "@/components/DocumentUploader";
import DocumentList from "@/components/DocumentList";
import ChatInterface from "@/components/ChatInterface";

interface DocumentInfo {
  documentId: string;
  documentName: string;
  totalChunks: number;
}

export default function Home() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch documents on mount
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUploadComplete = (doc: {
    documentId: string;
    fileName: string;
    chunkCount: number;
  }) => {
    const newDoc: DocumentInfo = {
      documentId: doc.documentId,
      documentName: doc.fileName,
      totalChunks: doc.chunkCount,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocumentId(doc.documentId);
    setSidebarOpen(false);
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(
        `/api/documents?documentId=${documentId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setDocuments((prev) =>
          prev.filter((d) => d.documentId !== documentId)
        );
        if (activeDocumentId === documentId) {
          setActiveDocumentId(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const activeDocument = documents.find(
    (d) => d.documentId === activeDocumentId
  );

  return (
    <div className="app-container">
      {/* Mobile header */}
      <div className="mobile-header">
        <button
          className="menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
          id="menu-toggle"
        >
          ☰
        </button>
        <span className="mobile-title">DocChat</span>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">💬</div>
            <h1>DocChat</h1>
          </div>
          <div className="sidebar-subtitle">
            RAG-Powered Document Q&A
          </div>
        </div>

        <div className="document-list-container">
          <DocumentList
            documents={documents}
            activeDocumentId={activeDocumentId}
            onSelectDocument={(id) => {
              setActiveDocumentId(id);
              setSidebarOpen(false);
            }}
            onDeleteDocument={handleDeleteDocument}
          />
        </div>

        <div className="sidebar-upload">
          <button
            className="upload-button"
            onClick={() => setIsUploadOpen(true)}
            id="upload-btn"
          >
            <span>+</span>
            Upload Document
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <ChatInterface
          activeDocumentId={activeDocumentId}
          activeDocumentName={activeDocument?.documentName ?? null}
        />
      </main>

      {/* Upload modal */}
      <DocumentUploader
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 5 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
