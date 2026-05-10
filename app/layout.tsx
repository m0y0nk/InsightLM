import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsightLM — AI Document Q&A | Chat with your PDFs",
  description:
    "Upload any PDF or text document and have an intelligent conversation with it. Powered by RAG (Retrieval-Augmented Generation) for accurate, grounded answers from your documents.",
  keywords: [
    "RAG",
    "document chat",
    "PDF Q&A",
    "AI",
    "NotebookLM",
    "document analysis",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💬</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
