import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

const PLAN_TO_PRICE_ID: Record<string, string> = {
  paid: process.env.STRIPE_PAID_PRICE_ID || "",
  premium: process.env.STRIPE_PREMIUM_PRICE_ID || "",
  agency: process.env.STRIPE_AGENCY_PRICE_ID || "",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to checkout." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || typeof (body as { priceId?: string }).priceId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid priceId." },
        { status: 400 }
      );
    }

    const priceId = (body as { priceId: string }).priceId.trim();
    // Stripe Checkout requires a Price ID (price_xxx), not a Product ID (prod_xxx)
    if (priceId.startsWith("prod_")) {
      return NextResponse.json(
        {
          error:
            "Use a Stripe Price ID (starts with price_), not a Product ID (prod_). In Stripe Dashboard: Product → Pricing → copy the Price ID.",
        },
        { status: 400 }
      );
    }
    const allowedIds = Object.values(PLAN_TO_PRICE_ID).filter(Boolean);
    if (!allowedIds.length || !allowedIds.includes(priceId)) {
      return NextResponse.json(
        { error: "Invalid price." },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/dashboard/billing?success=true`,
      cancel_url: `${APP_URL}/dashboard/billing?canceled=true`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url ?? null,
    });
  } catch (err: unknown) {
    console.error("[stripe/checkout]", err);
    const message =
      err instanceof Error ? err.message : "Checkout failed.";
    // Stripe often returns "No such price: 'prod_...'" when a Product ID was used instead of a Price ID
    const hint =
      message.includes("No such price") && message.includes("prod_")
        ? " Use a Price ID (price_...) from Stripe Dashboard → Product → Pricing."
        : "";
    return NextResponse.json(
      { error: message + hint },
      { status: 500 }
    );
  }
}
