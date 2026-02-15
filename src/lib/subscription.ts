import { createClient } from "@supabase/supabase-js";
import type { PlanId } from "./tier-limits";
import { normalizePlan } from "./tier-limits";

let adminClient: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase env not configured.");
    adminClient = createClient(url, key);
  }
  return adminClient;
}

/**
 * Fetches the user's current plan from the subscriptions table.
 * Use for server-side limit checks (API routes, server actions).
 * Returns 'free' if no row or not found.
 */
export async function getUserPlan(userId: string): Promise<PlanId> {
  if (!userId?.trim()) return "free";
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("current_period_end", { ascending: false, nullsFirst: true })
    .limit(1)
    .maybeSingle();
  return normalizePlan((data?.plan as string) ?? null);
}
