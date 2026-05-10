"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MessageBubble, { type Message } from "./MessageBubble";

interface Source {
  text: string;
  score: number;
  chunkIndex: number;
  totalChunks: number;
  documentName: string;
}

interface ChatInterfaceProps {
  activeDocumentId: string | null;
  activeDocumentName: string | null;
}

export default function ChatInterface({
  activeDocumentId,
  activeDocumentName,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Reset chat when document changes
  useEffect(() => {
    setMessages([]);
  }, [activeDocumentId]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const query = input.trim();
    if (!query || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
    };

    // Add placeholder AI message
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      role: "ai",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          documentId: activeDocumentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      // Parse sources from header
      let sources: Source[] = [];
      const sourcesHeader = response.headers.get("X-Sources");
      if (sourcesHeader) {
        try {
          sources = JSON.parse(decodeURIComponent(sourcesHeader));
        } catch {
          // Ignore parsing errors
        }
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          fullContent += text;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: fullContent }
                : msg
            )
          );
        }
      }

      // Finalize message with sources
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: fullContent, isStreaming: false, sources }
            : msg
        )
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content:
                  error instanceof Error
                    ? `⚠️ ${error.message}`
                    : "⚠️ Something went wrong. Please try again.",
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Empty state when no document is selected
  if (!activeDocumentId) {
    return (
      <>
        <div className="chat-area" ref={chatAreaRef}>
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <h2>Chat with your documents</h2>
            <p>
              Upload a PDF or text file, then ask questions about its content.
              Answers are grounded in your document — not generated from general knowledge.
            </p>
            <div className="empty-state-steps">
              <div className="empty-state-step">
                <div className="step-number">1</div>
                <div className="step-icon">📄</div>
                <div className="step-text">Upload a document</div>
              </div>
              <div className="empty-state-step">
                <div className="step-number">2</div>
                <div className="step-icon">🧠</div>
                <div className="step-text">AI processes it</div>
              </div>
              <div className="empty-state-step">
                <div className="step-number">3</div>
                <div className="step-icon">💬</div>
                <div className="step-text">Ask anything</div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="chat-area" ref={chatAreaRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h2>Ask about &ldquo;{activeDocumentName}&rdquo;</h2>
            <p>
              Your document has been processed and indexed. Ask any question
              about its content and get grounded, accurate answers.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <form className="chat-input-form" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about "${activeDocumentName}"...`}
              disabled={isLoading}
              rows={1}
              id="chat-input"
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              id="chat-send-btn"
            >
              ➤
            </button>
          </form>
          <div className="chat-input-hint">
            Press Enter to send • Shift+Enter for new line
          </div>
        </div>
      </div>
    </>
  );
}
