import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

/**
 * Routes that require authentication. Any request whose pathname starts
 * with one of these prefixes will be checked for a valid Supabase session.
 */
const PROTECTED_ROUTES: string[] = ["/dashboard", "/onboarding"];

/**
 * Where unauthenticated users are sent when they try to access a protected route.
 */
const LOGIN_PATH = "/login";

/**
 * Routes that authenticated users should NOT see (redirect them to dashboard instead).
 */
const AUTH_ROUTES: string[] = ["/login", "/signup"];

/**
 * The default destination after successful authentication.
 */
const DASHBOARD_PATH = "/dashboard";

/**
 * Next.js middleware that runs on every matched request.
 *
 * Responsibilities:
 * 1. Refresh the Supabase auth session (keeps tokens alive via cookie rotation).
 * 2. Protect `/dashboard/*` routes — redirect unauthenticated users to `/login`.
 * 3. Redirect already-authenticated users away from `/login` and `/signup` to `/dashboard`.
 *
 * IMPORTANT: Always call `supabase.auth.getUser()` rather than `getSession()`.
 * `getUser()` contacts the Supabase Auth server and guarantees the session is
 * valid, while `getSession()` only reads from the local cookie (which can be
 * tampered with).
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { supabase, response } = createClient(request);

  // Always refresh the session. This must happen before any route checks
  // so that expired tokens are rotated and the fresh cookies are set on
  // the response regardless of the outcome.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // --- Protected route check ---
  // If the user is NOT authenticated and is trying to access a protected route,
  // redirect them to the login page.
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = LOGIN_PATH;
    // Preserve the original destination so we can redirect back after login.
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // --- Auth route check ---
  // If the user IS authenticated and is visiting login/signup, send them
  // to the dashboard instead. No reason to show auth pages to logged-in users.
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = DASHBOARD_PATH;
    return NextResponse.redirect(redirectUrl);
  }

  // For all other routes (marketing pages, API routes, etc.) just continue
  // with the response that carries the refreshed auth cookies.
  return response;
}

/**
 * Matcher configuration.
 *
 * Run middleware on all routes EXCEPT:
 * - `_next/static` (static assets)
 * - `_next/image` (image optimization)
 * - `favicon.ico` (browser favicon)
 * - Common image/asset file extensions
 * - `api/chat` and `api/widget-config` (public endpoints hit by the embedded widget)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|api/chat|api/widget-config).*)",
  ],
};
