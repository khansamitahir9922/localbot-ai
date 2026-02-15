import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/subscription";
import { canAdd, getLimit } from "@/lib/tier-limits";

/**
 * POST /api/chatbots
 * Create a chatbot. Enforces plan limit (chatbots count).
 * Body: { workspace_id, name?, bot_name, primary_color?, welcome_message?, fallback_message?, widget_position?, show_branding? }
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
    if (!body || typeof body !== "object" || !(body as { workspace_id?: string }).workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required." },
        { status: 400 }
      );
    }

    const workspaceId = (body as { workspace_id: string }).workspace_id;

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found or access denied." }, { status: 404 });
    }

    const plan = await getUserPlan(user.id);

    const { data: allWorkspaces } = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", user.id);
    const wsIds = (allWorkspaces ?? []).map((w) => w.id as string);
    if (wsIds.length === 0) {
      return NextResponse.json({ error: "No workspace found." }, { status: 400 });
    }

    const { count: totalCount } = await supabase
      .from("chatbots")
      .select("id", { count: "exact", head: true })
      .in("workspace_id", wsIds);
    const total = totalCount ?? 0;
    const limit = getLimit(plan, "chatbots");

    if (!canAdd(plan, "chatbots", total)) {
      console.warn("[api/chatbots] limit hit", {
        userId: user.id,
        plan,
        total,
        limit,
      });
      return NextResponse.json(
        {
          error: "Chatbot limit reached for your plan. Upgrade to add more chatbots.",
          code: "LIMIT_CHATBOTS",
          plan,
          chatbotsUsed: total,
          chatbotsLimit: limit,
        },
        { status: 403 }
      );
    }

    const b = body as Record<string, unknown>;
    const insertPayload = {
      workspace_id: workspaceId,
      name: (b.name as string) ?? "My Chatbot",
      bot_name: (b.bot_name as string) ?? "Assistant",
      primary_color: (b.primary_color as string) ?? "#2563EB",
      welcome_message: (b.welcome_message as string) ?? "Hi! How can I help you today?",
      fallback_message:
        (b.fallback_message as string) ?? "I'm not sure about that. Please contact us for more help.",
      widget_position: (b.widget_position as string) ?? "bottom-right",
      show_branding: b.show_branding !== false,
    };

    const { data: created, error } = await supabase
      .from("chatbots")
      .insert(insertPayload)
      .select("id, embed_token")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to create chatbot." },
        { status: 500 }
      );
    }

    return NextResponse.json(created);
  } catch (err: unknown) {
    console.error("[api/chatbots]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
