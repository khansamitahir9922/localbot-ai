import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in browser/client components.
 * This client uses the anon key and relies on the user's session cookie
 * for authentication. Safe to call multiple times – the underlying SDK
 * deduplicates instances per origin.
 *
 * @returns A Supabase browser client instance
 */
export function createClient(): ReturnType<typeof createBrowserClient> {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
