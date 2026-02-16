import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/widget-config/[token]
 * Public endpoint: returns chatbot config for the embeddable widget.
 * Used by the script that loads with data-token="...".
 */

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars are not configured.");
  }
  return createClient(url, key);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  try {
    const { token } = await params;
    if (!token?.trim()) {
      return NextResponse.json(
        { error: "Token is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: chatbot, error } = await supabase
      .from("chatbots")
      .select("bot_name, primary_color, welcome_message, fallback_message, widget_position, avatar_style")
      .eq("embed_token", token.trim())
      .single();

    if (error || !chatbot) {
      return NextResponse.json(
        { error: "Chatbot not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      botName: (chatbot.bot_name as string) ?? "Assistant",
      primaryColor: (chatbot.primary_color as string) ?? "#0ea5e9",
      welcomeMessage: (chatbot.welcome_message as string) ?? "Hi! How can I help?",
      fallbackMessage:
        (chatbot.fallback_message as string) ??
        "I'm sorry, I don't have an answer for that. Please contact us directly.",
      widgetPosition: (chatbot.widget_position as string) ?? "bottom-right",
      avatarStyle: (chatbot.avatar_style as string) ?? "1",
    });
  } catch (err: unknown) {
    console.error("[/api/widget-config] Error:", err);
    return NextResponse.json(
      { error: "Failed to load widget config." },
      { status: 500 }
    );
  }
}
