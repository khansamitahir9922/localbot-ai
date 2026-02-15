import Stripe from "stripe";

/**
 * Server-side Stripe client. Use only in API routes or server code.
 * Requires STRIPE_SECRET_KEY in environment.
 */
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set.");
    }
    stripeInstance = new Stripe(key, { typescript: true });
  }
  return stripeInstance;
}
