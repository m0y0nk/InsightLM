"use client";

import { useState, useRef } from "react";

interface DocumentUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (doc: {
    documentId: string;
    fileName: string;
    chunkCount: number;
  }) => void;
}

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error";

export default function DocumentUploader({
  isOpen,
  onClose,
  onUploadComplete,
}: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setStatus("error");
      setStatusMessage("File too large. Maximum size is 10 MB.");
      return;
    }

    const validTypes = [
      "application/pdf",
      "text/plain",
      "text/markdown",
    ];
    const validExtensions = [".pdf", ".txt", ".md"];
    const isValid =
      validTypes.includes(selectedFile.type) ||
      validExtensions.some((ext) =>
        selectedFile.name.toLowerCase().endsWith(ext)
      );

    if (!isValid) {
      setStatus("error");
      setStatusMessage("Invalid file type. Please upload a PDF or TXT file.");
      return;
    }

    setFile(selectedFile);
    setStatus("idle");
    setStatusMessage("");
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus("uploading");
    setProgress(20);
    setStatusMessage("Uploading file...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(40);
      setStatusMessage("Parsing document...");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(70);
      setStatusMessage("Chunking & embedding...");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setProgress(100);
      setStatus("success");
      setStatusMessage(
        `✓ Processed ${data.chunkCount} chunks from ${data.fileName}`
      );

      onUploadComplete({
        documentId: data.documentId,
        fileName: data.fileName,
        chunkCount: data.chunkCount,
      });

      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      setStatus("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Upload failed. Please try again."
      );
    }
  };

  const handleClose = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setStatusMessage("");
    setDragOver(false);
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Upload Document</h2>
          <button
            className="modal-close"
            onClick={handleClose}
            aria-label="Close upload dialog"
            id="upload-modal-close"
          >
            ✕
          </button>
        </div>

        {/* Dropzone */}
        <div
          className={`dropzone ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) handleFileSelect(droppedFile);
          }}
          onClick={() => fileInputRef.current?.click()}
          id="upload-dropzone"
        >
          <span className="dropzone-icon">📄</span>
          <p className="dropzone-text">
            {dragOver
              ? "Drop your file here!"
              : "Drag & drop a file or click to browse"}
          </p>
          <p className="dropzone-hint">PDF or TXT • Max 10 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile) handleFileSelect(selectedFile);
            }}
            id="file-input"
          />
        </div>

        {/* File info & upload progress */}
        {file && (
          <div className="upload-progress">
            <div className="upload-file-info">
              <span className="upload-file-icon">
                {file.name.endsWith(".pdf") ? "📕" : "📝"}
              </span>
              <div className="upload-file-details">
                <div className="upload-file-name">{file.name}</div>
                <div className="upload-file-size">
                  {formatFileSize(file.size)}
                </div>
              </div>
            </div>

            {status !== "idle" && (
              <>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className={`upload-status ${status}`}>
                  {status === "uploading" || status === "processing" ? (
                    <div className="spinner" />
                  ) : null}
                  <span>{statusMessage}</span>
                </div>
              </>
            )}

            {status === "idle" && (
              <button
                className="upload-button"
                onClick={handleUpload}
                id="upload-submit-btn"
              >
                <span>⬆️</span>
                Upload & Process
              </button>
            )}
          </div>
        )}

        {/* Error without file */}
        {!file && status === "error" && (
          <div className="upload-status error" style={{ marginTop: 16 }}>
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
