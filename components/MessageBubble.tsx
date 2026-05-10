"use client";

import SourceChips from "./SourceChips";

interface Source {
  text: string;
  score: number;
  chunkIndex: number;
  totalChunks: number;
  documentName: string;
}

export interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

/**
 * Simple Markdown renderer for AI responses.
 * Handles bold, italic, headings, lists, code blocks, and inline code.
 */
function renderMarkdown(text: string): string {
  let html = text;

  // Code blocks (```...```)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre><code>$2</code></pre>'
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Unordered lists
  html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(
    /(<li>[\s\S]*?<\/li>)/g,
    (match) => {
      if (!match.startsWith('<ul>')) {
        return `<ul>${match}</ul>`;
      }
      return match;
    }
  );

  // Clean up nested <ul> tags
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p>');
  
  // Single newlines to <br>
  html = html.replace(/\n/g, '<br/>');

  // Wrap in paragraph if not already wrapped in a block element
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`;
  }

  return html;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`message message-${message.role}`}>
      <div className="message-avatar">
        {message.role === "user" ? "👤" : "🤖"}
      </div>
      <div className="message-content">
        <div className="message-sender">
          {message.role === "user" ? "You" : "DocChat"}
        </div>
        {message.role === "ai" ? (
          <div className="message-text">
            {message.isStreaming && message.content === "" ? (
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            ) : (
              <div
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(message.content),
                }}
              />
            )}
            {!message.isStreaming && message.sources && (
              <SourceChips sources={message.sources} />
            )}
          </div>
        ) : (
          <div className="message-text">{message.content}</div>
        )}
      </div>
    </div>
  );
}
