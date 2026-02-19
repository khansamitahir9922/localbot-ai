import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/subscription";
import { getTierLimits } from "@/lib/tier-limits";

/**
 * GET /api/limits/usage?chatbotId=xxx (optional)
 * Returns current usage and limits for the authenticated user.
 * If chatbotId is provided, also returns qaPairsUsed for that chatbot.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await getUserPlan(user.id);
    const limits = getTierLimits(plan);

    const { searchParams } = new URL(request.url);
    const chatbotId = searchParams.get("chatbotId")?.trim() ?? null;

    /* User's workspace ids */
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", user.id);
    const workspaceIds = (workspaces ?? []).map((w: { id: string }) => w.id);

    if (workspaceIds.length === 0) {
      return NextResponse.json({
        plan,
        chatbotsUsed: 0,
        chatbotsLimit: limits.chatbots,
        qaPairsUsed: chatbotId ? 0 : null,
        qaPairsLimit: limits.qaPairs,
        conversationsUsed: 0,
        conversationsLimit: limits.conversationsPerMonth,
      });
    }

    /* Count chatbots across all user workspaces */
    const { count: chatbotsCount } = await supabase
      .from("chatbots")
      .select("id", { count: "exact", head: true })
      .in("workspace_id", workspaceIds);

    const chatbotsUsed = chatbotsCount ?? 0;

    /* Conversations this month (conversations with created_at in current month) */
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const { data: userChatbots } = await supabase
      .from("chatbots")
      .select("id")
      .in("workspace_id", workspaceIds);
    const chatbotIds = (userChatbots ?? []).map((c: { id: string }) => c.id);

    let conversationsUsed = 0;
    if (chatbotIds.length > 0) {
      const { count: convCount } = await supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .in("chatbot_id", chatbotIds)
        .gte("created_at", startOfMonth);
      conversationsUsed = convCount ?? 0;
    }

    /* Q&A pairs: total across user's chatbots, or for one chatbot if chatbotId given */
    let qaPairsUsed: number | null = null;
    if (chatbotId) {
      const { count } = await supabase
        .from("qa_pairs")
        .select("id", { count: "exact", head: true })
        .eq("chatbot_id", chatbotId);
      qaPairsUsed = count ?? 0;
    } else if (chatbotIds.length > 0) {
      const { count } = await supabase
        .from("qa_pairs")
        .select("id", { count: "exact", head: true })
        .in("chatbot_id", chatbotIds);
      qaPairsUsed = count ?? 0;
    } else {
      qaPairsUsed = 0;
    }

    return NextResponse.json({
      plan,
      chatbotsUsed,
      chatbotsLimit: limits.chatbots,
      qaPairsUsed,
      qaPairsLimit: limits.qaPairs,
      conversationsUsed,
      conversationsLimit: limits.conversationsPerMonth,
    });
  } catch (err: unknown) {
    console.error("[limits/usage]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load usage" },
      { status: 500 }
    );
  }
}
