import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";

/* ─────────────────────────────────────────────────────────────
   POST /api/embeddings
   Accepts: { question: string; answer?: string }
   Returns: { embedding: number[] }
   ───────────────────────────────────────────────────────────── */

/** The model we use for all Q&A embeddings. */
const EMBEDDING_MODEL = "text-embedding-3-small";

/** Dimension of vectors produced by text-embedding-3-small. */
const EMBEDDING_DIMENSIONS = 1536;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    /* ── Validate API key ── */
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured." },
        { status: 500 }
      );
    }

    /* ── Parse body ── */
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !("question" in body) ||
      typeof (body as Record<string, unknown>).question !== "string"
    ) {
      return NextResponse.json(
        { error: "Request body must include a 'question' string." },
        { status: 400 }
      );
    }

    const { question, answer } = body as {
      question: string;
      answer?: string;
    };

    if (!question.trim()) {
      return NextResponse.json(
        { error: "'question' must not be empty." },
        { status: 400 }
      );
    }

    /*
     * Build the text to embed.
     * Including the answer gives the vector richer semantic signal so
     * that similar *topics* cluster together, not just similar phrasing.
     */
    const textToEmbed = answer
      ? `Question: ${question.trim()}\nAnswer: ${answer.trim()}`
      : question.trim();

    /* ── Call OpenAI Embeddings API ── */
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: textToEmbed,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const embedding = response.data[0]?.embedding;

    if (!embedding || embedding.length === 0) {
      return NextResponse.json(
        { error: "OpenAI returned an empty embedding." },
        { status: 502 }
      );
    }

    return NextResponse.json({ embedding });
  } catch (error: unknown) {
    console.error("[/api/embeddings] Error generating embedding:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";

    return NextResponse.json(
      { error: `Failed to generate embedding: ${message}` },
      { status: 500 }
    );
  }
}
