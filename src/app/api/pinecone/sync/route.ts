import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertVectorsBatch } from "@/lib/pinecone/client";
import type { VectorMetadata } from "@/lib/pinecone/client";

/* ─────────────────────────────────────────────────────────────
   POST /api/pinecone/sync
   Accepts : { chatbotId: string }
   Returns : { synced: number, failed: number }

   Fetches all qa_pairs for the chatbot that have an embedding,
   then bulk-upserts them to Pinecone. Useful for backfilling
   vectors after enabling embeddings or fixing sync gaps.
   ───────────────────────────────────────────────────────────── */

/** Pinecone recommends batches of ~100 vectors per upsert call. */
const BATCH_SIZE = 100;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    /* ── Auth ── */
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    /* ── Parse body ── */
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as Record<string, unknown>).chatbotId !== "string"
    ) {
      return NextResponse.json(
        { error: "Body must include chatbotId (string)." },
        { status: 400 }
      );
    }

    const { chatbotId } = body as { chatbotId: string };

    /* ── Verify the user owns this chatbot ── */
    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("id, workspace_id")
      .eq("id", chatbotId)
      .single();

    if (!chatbot) {
      return NextResponse.json(
        { error: "Chatbot not found." },
        { status: 404 }
      );
    }

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", chatbot.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!workspace) {
      return NextResponse.json(
        { error: "You do not have access to this chatbot." },
        { status: 403 }
      );
    }

    /* ── Fetch all Q&A pairs with embeddings ── */
    const { data: qaPairs, error: fetchError } = await supabase
      .from("qa_pairs")
      .select("id, question, answer, embedding")
      .eq("chatbot_id", chatbotId)
      .not("embedding", "is", null);

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch Q&A pairs: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!qaPairs || qaPairs.length === 0) {
      return NextResponse.json({ synced: 0, failed: 0, total: 0 });
    }

    /* ── Upsert to Pinecone in batches ── */
    let synced = 0;
    let failed = 0;

    for (let i = 0; i < qaPairs.length; i += BATCH_SIZE) {
      const batch = qaPairs.slice(i, i + BATCH_SIZE);

      const vectors = batch
        .map((row) => {
          /*
           * Supabase may return the vector column as a JSON string
           * (e.g. "[0.123, -0.456, ...]") instead of an actual array.
           * Parse it if needed.
           */
          let embeddingArr: number[] | null = null;

          if (Array.isArray(row.embedding)) {
            embeddingArr = row.embedding as number[];
          } else if (typeof row.embedding === "string") {
            try {
              const parsed = JSON.parse(row.embedding as string);
              if (Array.isArray(parsed)) embeddingArr = parsed;
            } catch (parseErr) {
              console.error(
                `[/api/pinecone/sync] JSON.parse failed for row ${row.id}:`,
                parseErr
              );
            }
          }

          if (!embeddingArr || embeddingArr.length === 0) return null;

          return {
            id: row.id as string,
            values: embeddingArr,
            metadata: {
              chatbot_id: chatbotId,
              question: row.question as string,
              answer: row.answer as string,
            } as VectorMetadata,
          };
        })
        .filter(
          (v): v is NonNullable<typeof v> => v !== null
        );

      if (vectors.length === 0) {
        failed += batch.length;
        continue;
      }

      try {
        await upsertVectorsBatch(vectors);
        synced += vectors.length;
      } catch (err) {
        console.error(
          `[/api/pinecone/sync] Batch upsert failed (batch starting at ${i}):`,
          err
        );
        failed += vectors.length;
      }
    }

    return NextResponse.json({
      synced,
      failed,
      total: qaPairs.length,
    });
  } catch (error: unknown) {
    console.error("[/api/pinecone/sync] Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Sync failed: ${message}` },
      { status: 500 }
    );
  }
}
