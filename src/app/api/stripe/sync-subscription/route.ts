import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

/**
 * POST /api/stripe/sync-subscription
 *
 * After checkout, Stripe sends a webhook to update the subscription. On localhost
 * the webhook often can't run, so the DB never updates. This endpoint looks up
 * the user's latest completed Stripe Checkout session and writes/updates the
 * subscriptions row (same logic as the webhook). Call it when the user lands on
 * billing?success=true so their plan updates without needing Stripe CLI.
 */
function getPriceIdToPlan(): Record<string, string> {
  const paid = process.env.STRIPE_PAID_PRICE_ID;
  const premium = process.env.STRIPE_PREMIUM_PRICE_ID;
  const agency = process.env.STRIPE_AGENCY_PRICE_ID;
  const map: Record<string, string> = {};
  if (paid) map[paid] = "paid";
  if (premium) map[premium] = "premium";
  if (agency) map[agency] = "agency";
  return map;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured.");
  return createClient(url, key);
}

const PRICE_ID_TO_PLAN = getPriceIdToPlan();

function priceIdToPlan(priceId: string): string {
  return PRICE_ID_TO_PLAN[priceId] ?? "paid";
}

export async function POST(): Promise<NextResponse> {
  try {
    const supabaseAuth = await createServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const stripe = getStripe();
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      status: "complete",
    });

    const forUser = (sessions.data || [])
      .filter((s) => s.client_reference_id === user.id)
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

    const session = forUser[0];
    if (!session) {
      return NextResponse.json(
        { error: "No completed checkout found for your account. If you just paid, try again in a moment." },
        { status: 404 }
      );
    }

    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    if (!customerId || !subscriptionId) {
      return NextResponse.json(
        { error: "Checkout session missing customer or subscription." },
        { status: 400 }
      );
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });
    const sub = subscription as { items: { data: Array<{ price?: { id?: string } }> }; current_period_end?: number };
    const priceId = sub.items.data[0]?.price?.id;
    const plan = priceId ? priceIdToPlan(priceId) : "paid";
    const currentPeriodEnd = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("[stripe/sync-subscription] fetch existing", fetchError);
      return NextResponse.json(
        { error: `Database error: ${fetchError.message}` },
        { status: 500 }
      );
    }

    const row = {
      user_id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      status: "active",
      current_period_end: currentPeriodEnd,
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update(row)
        .eq("user_id", user.id);
      if (updateError) {
        console.error("[stripe/sync-subscription] update failed", updateError);
        return NextResponse.json(
          { error: `Failed to update subscription: ${updateError.message}` },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from("subscriptions")
        .insert(row);
      if (insertError) {
        console.error("[stripe/sync-subscription] insert failed", insertError);
        return NextResponse.json(
          { error: `Failed to save subscription: ${insertError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ plan, synced: true });
  } catch (err: unknown) {
    console.error("[stripe/sync-subscription]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed." },
      { status: 500 }
    );
  }
}
