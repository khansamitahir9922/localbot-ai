import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/billing/plans
 * Returns available plans with Stripe price IDs (for checkout). Requires auth.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plans = [
      {
        id: "free",
        name: "Free",
        price: 0,
        priceId: null as string | null,
        description: "1 chatbot, 20 Q&As, 100 conversations/month",
      },
      {
        id: "paid",
        name: "Paid",
        price: 19,
        priceId: process.env.STRIPE_PAID_PRICE_ID || null,
        description: "3 chatbots, 200 Q&As, 2K conversations/month",
      },
      {
        id: "premium",
        name: "Premium",
        price: 49,
        priceId: process.env.STRIPE_PREMIUM_PRICE_ID || null,
        description: "Unlimited chatbots & Q&As, PDF reports, API access",
      },
      {
        id: "agency",
        name: "Agency",
        price: 99,
        priceId: process.env.STRIPE_AGENCY_PRICE_ID || null,
        description: "Everything in Premium + client workspaces, white-label",
      },
    ];

    return NextResponse.json({ plans });
  } catch (err: unknown) {
    console.error("[billing/plans]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load plans" },
      { status: 500 }
    );
  }
}
