import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";

/* ─────────────────────────────────────────────────────────────
   Stripe Webhook Handler
   Receives events from Stripe to keep subscription state in sync.

   IMPORTANT: The request body must be read as raw text for signature
   verification. Do not use request.json() in this route.

   Local testing with Stripe CLI:
   1. Install: https://stripe.com/docs/stripe-cli
   2. Login: stripe login
   3. Forward events: stripe listen --forward-to localhost:3000/api/stripe/webhook
   4. Copy the webhook signing secret (whsec_...) and set STRIPE_WEBHOOK_SECRET in .env.local
   5. Trigger test events: stripe trigger checkout.session.completed
      or: stripe trigger customer.subscription.updated
      or: stripe trigger customer.subscription.deleted
   ───────────────────────────────────────────────────────────── */

/** Map Stripe price IDs (from env) to our plan names. */
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

const PRICE_ID_TO_PLAN = getPriceIdToPlan();

function priceIdToPlan(priceId: string): string {
  return PRICE_ID_TO_PLAN[priceId] ?? "paid";
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured.");
  return createClient(url, key);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json(
      { error: "Webhook secret not configured." },
      { status: 500 }
    );
  }

  let payload: string;
  try {
    payload = await request.text();
  } catch (e) {
    console.error("[stripe/webhook] Failed to read body:", e);
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(payload, sig, secret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signature verification failed.";
    console.error("[stripe/webhook]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const stripe = getStripe();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!userId || !customerId || !subscriptionId) {
          console.error("[stripe/webhook] checkout.session.completed missing ids", {
            userId,
            customerId,
            subscriptionId,
          });
          return NextResponse.json(
            { error: "Missing session data." },
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

        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();

        const row = {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan,
          status: "active",
          current_period_end: currentPeriodEnd,
        };

        if (existing) {
          await supabase.from("subscriptions").update(row).eq("user_id", userId);
        } else {
          await supabase.from("subscriptions").insert(row);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number };
        const subscriptionId = subscription.id;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? priceIdToPlan(priceId) : "paid";
        const rawStatus = subscription.status;
        const status =
          rawStatus === "active" || rawStatus === "trialing"
            ? rawStatus
            : rawStatus === "past_due" || rawStatus === "incomplete"
              ? "past_due"
              : "canceled";
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan,
            status,
            current_period_end: currentPeriodEnd,
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          console.error("[stripe/webhook] subscription.updated update failed", error);
          return NextResponse.json(
            { error: "Failed to update subscription." },
            { status: 400 }
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            status: "canceled",
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          console.error("[stripe/webhook] subscription.deleted update failed", error);
          return NextResponse.json(
            { error: "Failed to update subscription." },
            { status: 400 }
          );
        }
        break;
      }

      default:
        // Unhandled event type – still return 200 so Stripe doesn't retry
        break;
    }
  } catch (err: unknown) {
    console.error("[stripe/webhook] Handler error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook processing failed." },
      { status: 400 }
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
