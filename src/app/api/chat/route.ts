import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import OpenAI from "openai";
import { queryVectors, type QueryMatch } from "@/lib/pinecone/client";

/* ─────────────────────────────────────────────────────────────
   POST /api/chat
   Public endpoint called by the embedded chat widget.

   Body : { token: string, message: string, session_id: string }
   Returns : { answer: string, confidence: number }

   Pipeline:
   1. Look up chatbot by embed_token
   2. Generate embedding for user message
   3. Query Pinecone for top‑5 similar Q&A pairs
   4. If top score > 0.75 → return direct answer (confidence 1)
   5. Else → ask GPT-4o-mini using top‑3 FAQs as context
   6. Save conversation + messages to Supabase
   7. Return answer
   ───────────────────────────────────────────────────────────── */

/* ────────────────────────── Config ────────────────────────── */

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const CHAT_MODEL = "gpt-4o-mini";
const DIRECT_MATCH_THRESHOLD = 0.75;
const TOP_K = 5;
const FAQ_CONTEXT_COUNT = 3;

/** Rate limit: max requests per window per token. */
const RATE_LIMIT_MAX = 10;
/** Rate limit window in milliseconds (1 minute). */
const RATE_LIMIT_WINDOW_MS = 60_000;

/* ────────────────────────── Clients ────────────────────────── */

/**
 * Supabase admin client using service role key.
 * Needed because this endpoint is public (no user session).
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars are not configured.");
  }
  return createSupabaseAdmin(url, key);
}

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/* ────────────────────────── Rate Limiter ────────────────────────── */

/** In-memory rate limiter: token → array of timestamps. */
const rateLimitMap = new Map<string, number[]>();

/** Clean up stale entries every 5 minutes. */
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60_000;

function isRateLimited(token: string): boolean {
  const now = Date.now();

  /* Periodic cleanup of the entire map */
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    for (const [key, timestamps] of rateLimitMap) {
      const active = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (active.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, active);
      }
    }
    lastCleanup = now;
  }

  /* Check this token */
  const timestamps = rateLimitMap.get(token) ?? [];
  const active = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (active.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(token, active);
    return true;
  }

  active.push(now);
  rateLimitMap.set(token, active);
  return false;
}

/* ────────────────────────── Route Handler ────────────────────────── */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    /* ── Parse body ── */
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as Record<string, unknown>).token !== "string" ||
      typeof (body as Record<string, unknown>).message !== "string" ||
      typeof (body as Record<string, unknown>).session_id !== "string"
    ) {
      return NextResponse.json(
        { error: "Body must include token, message, and session_id (all strings)." },
        { status: 400 }
      );
    }

    const { token, message, session_id } = body as {
      token: string;
      message: string;
      session_id: string;
    };

    if (!token.trim() || !message.trim() || !session_id.trim()) {
      return NextResponse.json(
        { error: "token, message, and session_id must not be empty." },
        { status: 400 }
      );
    }

    /* ── Rate limiting ── */
    if (isRateLimited(token)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    /* ═══════════════════════════════════════════════════════════
       STEP 1 — Look up chatbot by embed_token
       ═══════════════════════════════════════════════════════════ */

    const supabase = getSupabaseAdmin();

    const { data: chatbot, error: cbError } = await supabase
      .from("chatbots")
      .select(
        "id, workspace_id, bot_name, primary_color, welcome_message, fallback_message, widget_position"
      )
      .eq("embed_token", token.trim())
      .single();

    if (cbError || !chatbot) {
      return NextResponse.json(
        { error: "Chatbot not found. Check your embed token." },
        { status: 404 }
      );
    }

    /* Fetch workspace for business name */
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("name")
      .eq("id", chatbot.workspace_id)
      .single();

    const botName = (chatbot.bot_name as string) || "Assistant";
    const businessName = (workspace?.name as string) || "our business";
    const fallbackMessage =
      (chatbot.fallback_message as string) ||
      "I'm sorry, I don't have an answer for that. Please contact us directly.";

    /* ═══════════════════════════════════════════════════════════
       STEP 2 — Generate embedding for user's message
       ═══════════════════════════════════════════════════════════ */

    const openai = getOpenAI();

    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: message.trim(),
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const queryVector = embeddingResponse.data[0]?.embedding;

    if (!queryVector || queryVector.length === 0) {
      return NextResponse.json(
        { error: "Failed to process your message." },
        { status: 502 }
      );
    }

    /* ═══════════════════════════════════════════════════════════
       STEP 3 — Query Pinecone for similar Q&A pairs
       ═══════════════════════════════════════════════════════════ */

    let matches: QueryMatch[] = [];

    try {
      matches = await queryVectors(
        queryVector,
        chatbot.id as string,
        TOP_K
      );
    } catch (pineconeErr) {
      console.error("[/api/chat] Pinecone query error:", pineconeErr);
      /* Continue without matches — we'll use GPT fallback */
    }

    /* ═══════════════════════════════════════════════════════════
       STEP 4 & 5 — Determine answer
       ═══════════════════════════════════════════════════════════ */

    let answer: string;
    let confidence: number;

    const topMatch = matches[0];

    if (topMatch && topMatch.score > DIRECT_MATCH_THRESHOLD) {
      /* ── Direct match — high confidence ── */
      answer = topMatch.answer;
      confidence = 1;
    } else {
      /* ── GPT-generated answer using FAQ context ── */
      const faqContext = matches
        .slice(0, FAQ_CONTEXT_COUNT)
        .map(
          (m, i) =>
            `FAQ ${i + 1} (relevance: ${(m.score * 100).toFixed(0)}%):\nQ: ${m.question}\nA: ${m.answer}`
        )
        .join("\n\n");

      const systemPrompt = faqContext
        ? `You are ${botName}, a helpful customer service assistant for ${businessName}. Answer the user's question using ONLY the following FAQs as your knowledge base. Be friendly and concise. If the FAQs don't contain enough information to answer, say: "${fallbackMessage}"\n\nFAQs:\n${faqContext}`
        : `You are ${botName}, a helpful customer service assistant for ${businessName}. You don't have any FAQ data yet. Respond politely with: "${fallbackMessage}"`;

      try {
        const chatResponse = await openai.chat.completions.create({
          model: CHAT_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message.trim() },
          ],
          temperature: 0.3,
          max_tokens: 500,
        });

        answer =
          chatResponse.choices[0]?.message?.content?.trim() ||
          fallbackMessage;
      } catch (aiErr) {
        console.error("[/api/chat] OpenAI chat error:", aiErr);
        answer = fallbackMessage;
      }

      confidence = 0;
    }

    /* ═══════════════════════════════════════════════════════════
       STEP 6 — Save conversation & messages to Supabase
       ═══════════════════════════════════════════════════════════ */

    try {
      /* Find or create conversation */
      let conversationId: string;

      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("chatbot_id", chatbot.id)
        .eq("session_id", session_id.trim())
        .single();

      if (existingConv) {
        conversationId = existingConv.id as string;
      } else {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            chatbot_id: chatbot.id,
            session_id: session_id.trim(),
          })
          .select("id")
          .single();

        if (convError || !newConv) {
          console.error(
            "[/api/chat] Failed to create conversation:",
            convError?.message
          );
          /* Still return the answer even if we can't save */
          return NextResponse.json({ answer, confidence });
        }

        conversationId = newConv.id as string;
      }

      /* Insert user message and assistant message */
      await supabase.from("messages").insert([
        {
          conversation_id: conversationId,
          role: "user",
          content: message.trim(),
        },
        {
          conversation_id: conversationId,
          role: "assistant",
          content: answer,
        },
      ]);
    } catch (dbErr) {
      console.error("[/api/chat] Database save error:", dbErr);
      /* Non-blocking — still return the answer */
    }

    /* ═══════════════════════════════════════════════════════════
       STEP 7 — Return response
       ═══════════════════════════════════════════════════════════ */

    return NextResponse.json({ answer, confidence });
  } catch (error: unknown) {
    console.error("[/api/chat] Unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";
    return NextResponse.json(
      { error: `Chat failed: ${message}` },
      { status: 500 }
    );
  }
}
