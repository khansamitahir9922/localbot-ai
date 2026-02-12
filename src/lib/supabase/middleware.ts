import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Creates a Supabase client specifically designed for Next.js middleware.
 *
 * Middleware cannot use `next/headers` cookies() — it must read cookies
 * from the incoming `NextRequest` and write them to the outgoing
 * `NextResponse`. This function wires both directions so that
 * `supabase.auth.getUser()` can refresh expired sessions and propagate
 * the updated tokens back to the browser.
 *
 * @param request - The incoming Next.js middleware request
 * @returns An object containing the Supabase client and the NextResponse
 *          (which may carry updated auth cookies)
 */
export function createClient(request: NextRequest): {
  supabase: ReturnType<typeof createServerClient>;
  response: NextResponse;
} {
  // Start with a NextResponse that forwards the original request.
  // We reassign this when `setAll` is called so the final response
  // always carries the latest cookie values.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll(): ReturnType<typeof request.cookies.getAll> {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: Record<string, unknown>;
          }>
        ): void {
          // 1. Update request cookies so downstream server code sees fresh values
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          // 2. Recreate the response so it inherits the updated request cookies
          response = NextResponse.next({ request });

          // 3. Set the cookies on the response so the browser stores them
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, response };
}
