import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/chatbots/[id]/status
 * Returns whether the chatbot's widget/config endpoint is reachable ("online").
 * User must own the chatbot via workspace.
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
      .select("id, embed_token, workspace_id")
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

    const embedToken = (bot as { embed_token?: string }).embed_token;
    if (!embedToken?.trim()) {
      return NextResponse.json({
        online: false,
        message: "Chatbot has no embed token (widget not set up).",
      });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    const url = `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api/widget-config/${encodeURIComponent(embedToken.trim())}`;

    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return NextResponse.json({
      online: res.ok,
      message: res.ok
        ? "Widget endpoint is reachable."
        : "Widget endpoint returned an error.",
    });
  } catch (err: unknown) {
    console.error("[api/chatbots/status]", err);
    return NextResponse.json(
      {
        online: false,
        message: err instanceof Error ? err.message : "Status check failed.",
      },
      { status: 200 }
    );
  }
}
