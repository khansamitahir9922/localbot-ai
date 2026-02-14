/**
 * Client-side helpers for generating embeddings via /api/embeddings
 * and persisting them to the qa_pairs table.
 *
 * All functions are designed to be fire-and-forget friendly:
 * failures are caught, logged, and surfaced via toast – they never
 * block the main CRUD flow.
 *
 * ─── DEV MODE ───
 * When NEXT_PUBLIC_SKIP_EMBEDDINGS=true in .env.local, the API
 * route returns a mock embedding (1536 zeros) instead of calling
 * OpenAI. This lets the full flow work without credits during UI
 * development. Remove the flag when you're ready for real
 * embeddings (Week 5+).
 */

import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/* ────────────────────────── Types ────────────────────────── */

interface EmbeddingApiResponse {
  embedding?: number[];
  error?: string;
}

interface GenerateResult {
  success: boolean;
  pairId: string;
}

/* ────────────────────────── Core ────────────────────────── */

/**
 * Call the /api/embeddings route and return the vector.
 * Returns `null` when the call fails for any reason.
 */
export async function fetchEmbedding(
  question: string,
  answer?: string
): Promise<number[] | null> {
  try {
    const res = await fetch("/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer }),
    });

    const data: EmbeddingApiResponse = await res.json();

    if (!res.ok || !data.embedding) {
      console.warn(
        "[embeddings] API error:",
        data.error ?? `status ${res.status}`
      );
      return null;
    }

    return data.embedding;
  } catch (err) {
    console.warn("[embeddings] Network error:", err);
    return null;
  }
}

/**
 * Generate an embedding for a single Q&A pair and persist it
 * to the `qa_pairs` row in Supabase.
 *
 * Designed to run in the background — never throws.
 */
export async function generateAndStoreEmbedding(
  pairId: string,
  question: string,
  answer: string
): Promise<boolean> {
  const embedding = await fetchEmbedding(question, answer);
  if (!embedding) return false;

  const supabase = createClient();
  const { error } = await supabase
    .from("qa_pairs")
    .update({ embedding })
    .eq("id", pairId);

  if (error) {
    console.warn(
      `[embeddings] Failed to store embedding for pair ${pairId}:`,
      error.message
    );
    return false;
  }

  // TODO (Week 5): Upsert vector to Pinecone for semantic search
  return true;
}

/**
 * Generate embeddings for multiple Q&A pairs in parallel and
 * persist each one. Shows a single summary toast when done.
 *
 * @param pairs Array of { id, question, answer } objects (the rows
 *              that were just inserted into Supabase).
 * @param showToast If `true` (default), shows a toast with results.
 */
export async function generateEmbeddingsBatch(
  pairs: { id: string; question: string; answer: string }[],
  showToast = true
): Promise<void> {
  if (pairs.length === 0) return;

  const results: GenerateResult[] = await Promise.all(
    pairs.map(async (p) => ({
      success: await generateAndStoreEmbedding(p.id, p.question, p.answer),
      pairId: p.id,
    }))
  );

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;

  if (!showToast) return;

  if (failed === 0) {
    toast.success(
      `Embeddings generated for ${succeeded} Q&A pair${succeeded !== 1 ? "s" : ""}.`
    );
  } else if (succeeded === 0) {
    /* Silent in dev — only log to console */
    console.warn(
      "[embeddings] All embeddings failed. This is expected if OpenAI credits are not set up yet."
    );
  } else {
    toast.warning(
      `Embeddings: ${succeeded} succeeded, ${failed} failed. Failed ones can be retried later.`
    );
  }
}
