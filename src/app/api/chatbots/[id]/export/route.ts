import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/chatbots/[id]/export
 * Returns all chatbot data (settings, qa_pairs, conversations, messages) as JSON.
 * User must own the chatbot.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatbotId } = await params;
    if (!chatbotId?.trim()) {
      return NextResponse.json(
        { error: "Chatbot ID is required." },
        { status: 400 }
      );
    }

    const { data: bot } = await supabase
      .from("chatbots")
      .select("id, name, bot_name, workspace_id")
      .eq("id", chatbotId.trim())
      .single();

    if (!bot) {
      return NextResponse.json({ error: "Chatbot not found." }, { status: 404 });
    }

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", (bot as { workspace_id: string }).workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const id = chatbotId.trim();

    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", id)
      .single();

    const { data: qaPairs } = await supabase
      .from("qa_pairs")
      .select("id, question, answer, created_at")
      .eq("chatbot_id", id)
      .order("created_at", { ascending: true });

    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, session_id, created_at")
      .eq("chatbot_id", id)
      .order("created_at", { ascending: true });

    const convIds = (conversations ?? []).map((c: { id: string }) => c.id);
    let messages: unknown[] = [];
    if (convIds.length > 0) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, conversation_id, role, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: true });
      messages = msgs ?? [];
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      chatbot: chatbot ?? null,
      qaPairs: qaPairs ?? [],
      conversations: conversations ?? [],
      messages,
    };

    return NextResponse.json(exportData);
  } catch (err: unknown) {
    console.error("[api/chatbots/export]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed." },
      { status: 500 }
    );
  }
}
