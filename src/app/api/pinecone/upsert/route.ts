import { NextResponse, type NextRequest } from "next/server";
import { upsertVector } from "@/lib/pinecone/client";

/* ─────────────────────────────────────────────────────────────
   POST /api/pinecone/upsert
   Accepts : { id, vector, metadata: { chatbot_id, question, answer } }
   Returns : { success: true }

   Upserts a single embedding vector into Pinecone so it can be
   used for semantic search in the chat API.
   ───────────────────────────────────────────────────────────── */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as Record<string, unknown>).id !== "string" ||
      !Array.isArray((body as Record<string, unknown>).vector) ||
      !((body as Record<string, unknown>).metadata)
    ) {
      return NextResponse.json(
        { error: "Body must include id (string), vector (number[]), and metadata." },
        { status: 400 }
      );
    }

    const { id, vector, metadata } = body as {
      id: string;
      vector: number[];
      metadata: { chatbot_id: string; question: string; answer: string };
    };

    await upsertVector(id, vector, metadata);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[/api/pinecone/upsert] Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Pinecone upsert failed: ${message}` },
      { status: 500 }
    );
  }
}
