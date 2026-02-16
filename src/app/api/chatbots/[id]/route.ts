import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteVectors } from "@/lib/pinecone/client";

/**
 * Verify the authenticated user owns the chatbot (via workspace).
 */
async function getChatbotAndVerify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  chatbotId: string
) {
  const { data: bot } = await supabase
    .from("chatbots")
    .select("id, workspace_id")
    .eq("id", chatbotId)
    .single();

  if (!bot) return { error: "Chatbot not found.", status: 404 } as const;

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", (bot as { workspace_id: string }).workspace_id)
    .eq("user_id", userId)
    .single();

  if (!workspace)
    return { error: "Access denied.", status: 403 } as const;

  return { bot } as const;
}

/**
 * GET /api/chatbots/[id]
 * Return chatbot settings for the owner (for settings form).
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

    const result = await getChatbotAndVerify(supabase, user.id, chatbotId.trim());
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const { data: bot } = await supabase
      .from("chatbots")
      .select("id, name, bot_name, primary_color, welcome_message, fallback_message, widget_position, avatar_style")
      .eq("id", chatbotId.trim())
      .single();

    if (!bot) {
      return NextResponse.json({ error: "Chatbot not found." }, { status: 404 });
    }

    return NextResponse.json(bot);
  } catch (err: unknown) {
    console.error("[api/chatbots GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chatbots/[id]
 * Update chatbot settings. Body: { name?, bot_name?, primary_color?, welcome_message?, fallback_message?, widget_position?, avatar_style? }
 */
export async function PATCH(
  request: NextRequest,
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

    const result = await getChatbotAndVerify(supabase, user.id, chatbotId.trim());
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string") updates.name = body.name;
    if (typeof body.bot_name === "string") updates.bot_name = body.bot_name;
    if (typeof body.primary_color === "string")
      updates.primary_color = body.primary_color;
    if (typeof body.welcome_message === "string")
      updates.welcome_message = body.welcome_message;
    if (typeof body.fallback_message === "string")
      updates.fallback_message = body.fallback_message;
    if (
      body.widget_position === "bottom-left" ||
      body.widget_position === "bottom-right"
    ) {
      updates.widget_position = body.widget_position;
    }
    if (typeof body.avatar_style === "string" && /^([1-9]|10)$/.test(body.avatar_style)) {
      updates.avatar_style = body.avatar_style;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("chatbots")
      .update(updates)
      .eq("id", chatbotId.trim());

    if (error) {
      return NextResponse.json(
        { error: error.message || "Update failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[api/chatbots PATCH]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chatbots/[id]
 * Delete the chatbot and all related data (messages, conversations, qa_pairs, Pinecone vectors).
 */
export async function DELETE(
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

    const result = await getChatbotAndVerify(supabase, user.id, chatbotId.trim());
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const id = chatbotId.trim();

    /* Get qa_pairs ids for Pinecone deletion */
    const { data: qaRows } = await supabase
      .from("qa_pairs")
      .select("id")
      .eq("chatbot_id", id);
    const qaIds = (qaRows ?? []).map((r) => r.id as string);

    /* Delete Pinecone vectors (optional; ignore errors if Pinecone not configured) */
    if (qaIds.length > 0) {
      try {
        await deleteVectors(qaIds);
      } catch (pineconeErr) {
        console.warn("[api/chatbots DELETE] Pinecone delete failed:", pineconeErr);
      }
    }

    /* Get conversation ids for this chatbot */
    const { data: convRows } = await supabase
      .from("conversations")
      .select("id")
      .eq("chatbot_id", id);
    const convIds = (convRows ?? []).map((r) => r.id as string);

    /* Delete messages in those conversations */
    if (convIds.length > 0) {
      await supabase.from("messages").delete().in("conversation_id", convIds);
    }

    /* Delete conversations */
    await supabase.from("conversations").delete().eq("chatbot_id", id);

    /* Delete qa_pairs */
    await supabase.from("qa_pairs").delete().eq("chatbot_id", id);

    /* Delete chatbot */
    const { error: botError } = await supabase
      .from("chatbots")
      .delete()
      .eq("id", id);

    if (botError) {
      return NextResponse.json(
        { error: botError.message || "Delete failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[api/chatbots DELETE]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed." },
      { status: 500 }
    );
  }
}
