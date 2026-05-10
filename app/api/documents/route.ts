/**
 * Documents API Route
 * 
 * GET /api/documents — List all uploaded documents
 * DELETE /api/documents — Delete a document and its vectors
 */

import { NextRequest, NextResponse } from "next/server";
import { listDocuments, deleteDocument } from "@/lib/vectorStore";

export async function GET() {
  try {
    const documents = await listDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve documents.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId query parameter is required." },
        { status: 400 }
      );
    }

    await deleteDocument(documentId);

    return NextResponse.json({
      success: true,
      message: `Document ${documentId} deleted successfully.`,
    });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete document.",
      },
      { status: 500 }
    );
  }
}
