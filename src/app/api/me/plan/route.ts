import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/subscription";
import { getLimit } from "@/lib/tier-limits";

/**
 * GET /api/me/plan
 * Returns the current user's plan and chatbot usage as seen by the server.
 * Use for debugging when onboarding says "limit reached" but Billing shows Paid.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const plan = await getUserPlan(user.id);

    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", user.id);
    const wsIds = (workspaces ?? []).map((w) => w.id as string);
    let chatbotsCount = 0;
    if (wsIds.length > 0) {
      const { count } = await supabase
        .from("chatbots")
        .select("id", { count: "exact", head: true })
        .in("workspace_id", wsIds);
      chatbotsCount = count ?? 0;
    }

    const chatbotsLimit = getLimit(plan, "chatbots");

    return NextResponse.json({
      plan,
      userId: user.id,
      chatbotsUsed: chatbotsCount,
      chatbotsLimit,
      canAddChatbot: chatbotsCount < chatbotsLimit,
    });
  } catch (err: unknown) {
    console.error("[api/me/plan]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
