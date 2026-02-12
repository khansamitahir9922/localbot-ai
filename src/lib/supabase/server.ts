import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Reads and writes auth cookies via Next.js `cookies()`.
 *
 * Must be called inside a server-side context (not in client components).
 * The `setAll` call is wrapped in a try/catch because Server Components
 * cannot set cookies — only Server Actions and Route Handlers can.
 * Middleware handles session refresh for Server Component requests.
 *
 * @returns A Supabase server client instance
 */
export async function createClient(): Promise<
  ReturnType<typeof createServerClient>
> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll(): ReturnType<typeof cookieStore.getAll> {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: Record<string, unknown>;
          }>
        ): void {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` was called from a Server Component.
            // This is safe to ignore when middleware is refreshing sessions.
          }
        },
      },
    }
  );
}
