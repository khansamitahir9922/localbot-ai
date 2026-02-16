import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/widget-config/[token]/knowledge
 * Public: returns knowledge base (Q&A pairs) for the widget. Used by FAQs and Articles tabs.
 * Only returns Q&A pairs for the chatbot that owns this embed token (bot-specific).
 */

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not configured.");
  return createClient(url, key);
}

const MAX_ITEMS = 150;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  try {
    const { token } = await params;
    if (!token?.trim()) {
      return NextResponse.json({ error: "Token is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: chatbot, error: botError } = await supabase
      .from("chatbots")
      .select("id")
      .eq("embed_token", token.trim())
      .single();

    if (botError || !chatbot) {
      return NextResponse.json({ error: "Chatbot not found." }, { status: 404 });
    }

    const chatbotId = (chatbot as { id: string }).id;

    // Only this bot's knowledge base: qa_pairs where chatbot_id = this chatbot
    const { data: rows, error } = await supabase
      .from("qa_pairs")
      .select("question, answer")
      .eq("chatbot_id", chatbotId)
      .order("created_at", { ascending: false })
      .limit(MAX_ITEMS);

    if (error) {
      console.error("[/api/widget-config/.../knowledge]", error);
      return NextResponse.json(
        { error: "Failed to load knowledge base." },
        { status: 500 }
      );
    }

    const items = (rows ?? []).map((r) => ({
      question: (r.question as string) ?? "",
      answer: (r.answer as string) ?? "",
    }));

    return NextResponse.json({
      categories: [
        {
          id: "default",
          name: "Knowledge Base",
          count: items.length,
          items,
        },
      ],
    });
  } catch (err: unknown) {
    console.error("[/api/widget-config/.../knowledge]", err);
    return NextResponse.json(
      { error: "Failed to load knowledge base." },
      { status: 500 }
    );
  }
}
