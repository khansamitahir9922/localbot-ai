import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/subscription";
import { getTierLimits } from "@/lib/tier-limits";

type Pair = { question: string; answer: string };

/**
 * POST /api/qa-pairs
 * Create one or more Q&A pairs. Enforces plan Q&A limit (total across all user's chatbots).
 * Body: { chatbotId: string, question: string, answer: string } for one, or
 *       { chatbotId: string, pairs: [{ question, answer }, ...] } for many.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || !(body as { chatbotId?: string }).chatbotId) {
      return NextResponse.json(
        { error: "chatbotId is required." },
        { status: 400 }
      );
    }

    const chatbotId = (body as { chatbotId: string }).chatbotId;
    let pairs: Pair[] = [];
    if (Array.isArray((body as { pairs?: Pair[] }).pairs)) {
      pairs = (body as { pairs: Pair[] }).pairs.filter(
        (p) => typeof p?.question === "string" && typeof p?.answer === "string"
      );
    } else if (
      typeof (body as { question?: string }).question === "string" &&
      typeof (body as { answer?: string }).answer === "string"
    ) {
      pairs = [
        {
          question: (body as { question: string }).question.trim(),
          answer: (body as { answer: string }).answer.trim(),
        },
      ];
    }

    if (pairs.length === 0) {
      return NextResponse.json(
        { error: "Provide question/answer or pairs array." },
        { status: 400 }
      );
    }

    const { data: chatbot } = await supabase
      .from("chatbots")
      .select("id, workspace_id")
      .eq("id", chatbotId)
      .single();

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found." }, { status: 404 });
    }

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", chatbot.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: "Access denied to this chatbot." }, { status: 403 });
    }

    const plan = await getUserPlan(user.id);

    const { data: userWorkspaces } = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", user.id);
    const wsIds = (userWorkspaces ?? []).map((w: { id: string }) => w.id);
    if (wsIds.length === 0) {
      return NextResponse.json({ error: "No workspace." }, { status: 400 });
    }

    const { data: userChatbots } = await supabase
      .from("chatbots")
      .select("id")
      .in("workspace_id", wsIds);
    const cbIds = (userChatbots ?? []).map((c: { id: string }) => c.id);

    const { count: existingCount } = await supabase
      .from("qa_pairs")
      .select("id", { count: "exact", head: true })
      .in("chatbot_id", cbIds);

    const currentTotal = existingCount ?? 0;
    const qaLimit = getTierLimits(plan).qaPairs;
    if (currentTotal + pairs.length > qaLimit) {
      return NextResponse.json(
        {
          error: "Q&A pair limit reached for your plan. Upgrade to add more.",
          code: "LIMIT_QA_PAIRS",
        },
        { status: 403 }
      );
    }

    const rows = pairs.map((p) => ({
      chatbot_id: chatbotId,
      question: p.question.trim(),
      answer: p.answer.trim(),
    }));

    const { data: inserted, error } = await supabase
      .from("qa_pairs")
      .insert(rows)
      .select("id");

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to add Q&A pairs." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      inserted: inserted?.length ?? 0,
      ids: (inserted ?? []).map((r: { id: string }) => r.id),
    });
  } catch (err: unknown) {
    console.error("[api/qa-pairs]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
