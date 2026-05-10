# InsightLM — RAG-Powered Document Q&A

A full-stack RAG (Retrieval-Augmented Generation) application where users can upload documents (PDF/TXT) and have intelligent, grounded conversations with their content. Built as a modern alternative to Google NotebookLM.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Gemini](https://img.shields.io/badge/Google_Gemini-2.0_Flash-green?style=flat-square&logo=google)
![Qdrant](https://img.shields.io/badge/Qdrant-Cloud-red?style=flat-square)

## ✨ Features

- **📄 Document Upload** — Upload PDFs and text files with drag-and-drop
- **✂️ Smart Chunking** — Recursive text splitting that preserves semantic boundaries
- **🧠 Embedding** — Google Gemini `gemini-embedding-2` (3072 dimensions)
- **💾 Vector Storage** — Qdrant Cloud for fast similarity search
- **💬 Grounded Chat** — Streaming AI responses grounded in document content
- **📎 Source Citations** — See which document chunks were used for each answer
- **🎨 Premium UI** — Dark theme with glassmorphism, animations, and responsive design

## 🏗️ Architecture

```
User uploads PDF/TXT
        ↓
  [Next.js API Route]
        ↓
  ┌───────────────────────────────────────┐
  │  1. Parse (pdf-parse)                 |
  │  2. Chunk (recursive splitter)        |
  │  3. Embed (Gemini gemini-embedding-2) |
  │  4. Store (Qdrant Cloud)              |
  └───────────────────────────────────────┘

User asks a question
        ↓
  [Next.js API Route]
        ↓
  ┌───────────────────────────────────────────┐
  │  1. Embed query (Gemini)                  |
  │  2. Search (Qdrant top-5)                 |
  │  3. Generate (Gemini 2.0 Flash + context) |
  │  4. Stream response to client             |
  └───────────────────────────────────────────┘
```

## 📦 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **PDF Parsing** | pdf-parse |
| **Embeddings** | Google Gemini gemini-embedding-2 |
| **Vector DB** | Qdrant Cloud |
| **LLM** | Google Gemini 2.0 Flash |
| **Styling** | Vanilla CSS (custom design system) |
| **Deployment** | Vercel |

## 🧩 Chunking Strategy

### Recursive Character Text Splitting with Overlap

The chunker uses a **recursive approach** that tries to split text at the most semantically meaningful boundaries first, falling back to less meaningful ones as needed:

1. **`\n\n`** — Paragraph breaks (most preferred)
2. **`\n`** — Line breaks
3. **`. `** — Sentence endings
4. **` `** — Word boundaries
5. **`""`** — Character-level (last resort)

**Parameters:**
- **Chunk Size:** 500 characters — balances context richness with retrieval precision
- **Chunk Overlap:** 50 characters — ensures information at chunk boundaries isn't lost

**Why this strategy?**
- Preserves paragraph and sentence structure for better semantic understanding
- Overlap prevents loss of context at chunk boundaries
- Recursive approach handles documents of any structure (academic papers, code, prose)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Google Gemini API Key](https://aistudio.google.com/apikey) (free)
- A [Qdrant Cloud](https://cloud.qdrant.io) cluster (free tier)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/m0y0nk/InsightLM.git
   cd insight-lm
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your API keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   QDRANT_URL=https://your-cluster.cloud.qdrant.io:6333
   QDRANT_API_KEY=your_qdrant_api_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
insight-lm/
├── app/
│   ├── layout.tsx              # Root layout with SEO metadata
│   ├── page.tsx                # Main application page
│   ├── globals.css             # Complete design system
│   └── api/
│       ├── upload/route.ts     # Document ingestion pipeline
│       ├── chat/route.ts       # RAG query + streaming response
│       └── documents/route.ts  # Document management (list/delete)
├── lib/
│   ├── chunker.ts              # Recursive text splitter
│   ├── embeddings.ts           # Gemini embedding wrapper
│   ├── vectorStore.ts          # Qdrant client wrapper
│   ├── llm.ts                  # Gemini LLM with grounding prompt
│   └── pdfParser.ts            # PDF/TXT text extraction
├── components/
│   ├── ChatInterface.tsx       # Chat UI with streaming
│   ├── DocumentUploader.tsx    # Upload modal with drag-and-drop
│   ├── MessageBubble.tsx       # Chat message with markdown
│   ├── DocumentList.tsx        # Sidebar document list
│   └── SourceChips.tsx         # Source citation chips
├── .env.example                # Environment variable template
└── README.md
```

## 🔌 API Endpoints

### `POST /api/upload`
Upload and process a document.

**Request:** `multipart/form-data` with `file` field  
**Response:**
```json
{
  "success": true,
  "documentId": "uuid",
  "fileName": "document.pdf",
  "chunkCount": 42,
  "charCount": 21000,
  "pageCount": 10
}
```

### `POST /api/chat`
Ask a question about a document.

**Request:**
```json
{
  "query": "What is the main topic?",
  "documentId": "uuid"
}
```
**Response:** Streaming text with `X-Sources` header containing source chunks.

### `GET /api/documents`
List all uploaded documents.

### `DELETE /api/documents?documentId=uuid`
Delete a document and its vectors.

## 🛡️ Answer Grounding

The system prompt explicitly constrains the LLM to:
- **Only use provided context** — no general knowledge
- **Cite sources** — reference specific document sections
- **Acknowledge gaps** — clearly state when information isn't in the document
- **Format responses** — use Markdown for readability

## 📝 License

MIT
