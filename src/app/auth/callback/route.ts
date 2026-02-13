import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback
 *
 * Supabase redirects users here after:
 * - Email confirmation (signup)
 * - OAuth provider login (Google, GitHub, etc.)
 * - Password reset link click
 *
 * The URL contains a `code` query param that must be exchanged for a
 * valid session. Additional params control where we redirect:
 * - `type=recovery` → send to `/reset-password` (password reset flow)
 * - `next=/some-path` → send to that path (general purpose)
 * - default → send to `/dashboard`
 *
 * Flow:
 * 1. Read `code`, `type`, and `next` from the URL search params.
 * 2. Exchange the code for a Supabase session.
 * 3. Redirect based on the flow type.
 * 4. Redirect to `/login?error=...` on failure.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Password recovery flow → send to reset-password page.
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/reset-password", origin));
      }

      // Explicit next param → honour it.
      if (next) {
        return NextResponse.redirect(new URL(next, origin));
      }

      // Default → dashboard.
      return NextResponse.redirect(new URL("/dashboard", origin));
    }
  }

  // If there was no code or the exchange failed, send the user to login
  // with a descriptive error param the login page can optionally display.
  return NextResponse.redirect(
    new URL("/login?error=Unable+to+authenticate", origin)
  );
}
