import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/analytics?chatbotId=xxx (optional)
 * Returns analytics for the given chatbot (current month).
 * If chatbotId is omitted, uses the user's chatbot with the most conversations this month.
 * User must own the chatbot via workspace.
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

    const { searchParams } = new URL(request.url);
    let chatbotId = searchParams.get("chatbotId")?.trim();

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfMonthIso = startOfMonth.toISOString();

    /* If no chatbotId, pick the user's chatbot with most conversations this month */
    if (!chatbotId) {
      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", user.id);
      const wsIds = (workspaces ?? []).map((w) => w.id as string);
      if (wsIds.length === 0) {
        return NextResponse.json({ error: "No workspace found." }, { status: 404 });
      }
      const { data: chatbots } = await supabase
        .from("chatbots")
        .select("id")
        .in("workspace_id", wsIds);
      const botIds = (chatbots ?? []).map((b) => b.id as string);
      if (botIds.length === 0) {
        return NextResponse.json({ error: "No chatbot found." }, { status: 404 });
      }
      let bestId = botIds[0];
      let bestCount = 0;
      for (const bid of botIds) {
        const { count } = await supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("chatbot_id", bid)
          .gte("created_at", startOfMonthIso);
        const c = count ?? 0;
        if (c > bestCount) {
          bestCount = c;
          bestId = bid;
        }
      }
      chatbotId = bestId;
    }

    /* Verify user owns chatbot via workspace */
    const { data: bot } = await supabase
      .from("chatbots")
      .select("id, name, fallback_message, workspace_id")
      .eq("id", chatbotId)
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

    const fallbackMessage =
      ((bot as { fallback_message?: string }).fallback_message as string)?.trim() ||
      "I'm not sure about that. Please contact us for more help.";

    /* Conversations in current month */
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, created_at")
      .eq("chatbot_id", chatbotId)
      .gte("created_at", startOfMonthIso)
      .order("created_at", { ascending: true });

    const conversationIds = (conversations ?? []).map((c) => c.id as string);
    const totalConversations = conversationIds.length;

    const chatbotName = (bot as { name?: string }).name ?? "Chatbot";

    if (conversationIds.length === 0) {
      return NextResponse.json({
        chatbotId,
        chatbotName,
        totalConversations: 0,
        totalMessages: 0,
        answered: 0,
        unanswered: 0,
        conversationsPerDay: [],
        topQuestions: [],
        recentUnanswered: [],
      });
    }

    /* All messages for these conversations */
    const { data: messages } = await supabase
      .from("messages")
      .select("id, conversation_id, role, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });

    const msgs = (messages ?? []) as Array<{
      id: string;
      conversation_id: string;
      role: string;
      content: string | null;
      created_at?: string;
    }>;

    const totalMessages = msgs.length;
    const assistantMessages = msgs.filter((m) => m.role === "assistant");
    const answered = assistantMessages.filter(
      (m) => (m.content ?? "").trim() !== fallbackMessage
    ).length;
    const unansweredMessages = assistantMessages.filter(
      (m) => (m.content ?? "").trim() === fallbackMessage
    );

    /* Conversations per day for last 7 days */
    const last7Days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      d.setUTCHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setUTCDate(next.getUTCDate() + 1);
      const dayStart = d.toISOString();
      const dayEnd = next.toISOString();
      const count = (conversations ?? []).filter(
        (c) => {
          const t = (c as { created_at?: string }).created_at;
          return t && t >= dayStart && t < dayEnd;
        }
      ).length;
      last7Days.push({
        date: d.toISOString().slice(0, 10),
        count,
      });
    }

    /* Top 10 user questions (by content frequency) */
    const userMsgs = msgs.filter((m) => m.role === "user");
    const questionCounts = new Map<string, number>();
    for (const m of userMsgs) {
      const q = (m.content ?? "").trim();
      if (!q) continue;
      questionCounts.set(q, (questionCounts.get(q) ?? 0) + 1);
    }
    const topQuestions = Array.from(questionCounts.entries())
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    /* Recent unanswered: user message that got fallback reply */
    const convToMessages = new Map<string, typeof msgs>();
    for (const m of msgs) {
      if (!convToMessages.has(m.conversation_id)) {
        convToMessages.set(m.conversation_id, []);
      }
      convToMessages.get(m.conversation_id)!.push(m);
    }
    const recentUnanswered: { userMessage: string; conversationId: string; createdAt: string }[] = [];
    for (const convId of convToMessages.keys()) {
      const list = convToMessages.get(convId)!;
      for (let i = 0; i < list.length - 1; i++) {
        if (list[i].role === "user" && list[i + 1].role === "assistant") {
          const assistantContent = (list[i + 1].content ?? "").trim();
          if (assistantContent === fallbackMessage) {
            recentUnanswered.push({
              userMessage: (list[i].content ?? "").trim(),
              conversationId: convId,
              createdAt: list[i].created_at ?? new Date().toISOString(),
            });
          }
        }
      }
    }
    recentUnanswered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const recentUnansweredSlice = recentUnanswered.slice(0, 20);

    return NextResponse.json({
      chatbotId,
      chatbotName,
      totalConversations,
      totalMessages,
      answered,
      unanswered: unansweredMessages.length,
      conversationsPerDay: last7Days,
      topQuestions,
      recentUnanswered: recentUnansweredSlice,
    });
  } catch (err: unknown) {
    console.error("[api/analytics]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load analytics." },
      { status: 500 }
    );
  }
}
