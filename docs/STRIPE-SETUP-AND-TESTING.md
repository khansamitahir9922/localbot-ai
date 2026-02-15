# Stripe setup and testing payments

This guide gets you from "No such price" to a working upgrade flow you can test with a dummy card.

---

## Why you saw "No such price: 'prod_Tywh3hSfeQm0TO'"

- Stripe has **Products** (e.g. "Paid plan") and **Prices** (e.g. "$19/month recurring").
- Checkout needs a **Price ID** (starts with `price_`), not a **Product ID** (starts with `prod_`).
- If your env has `STRIPE_PAID_PRICE_ID=prod_Tywh3hSfeQm0TO`, that’s a product ID, so Stripe returns "No such price".

**Fix:** Use **Price** IDs from Stripe everywhere (see below).

---

## 1. Use Stripe test mode

For dummy card testing, use **test mode** (no real charges).

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com).
2. Toggle **Test mode** ON (top right).
3. Get your keys: **Developers → API keys**.
   - **Publishable key:** `pk_test_...`
   - **Secret key:** `sk_test_...`

In `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
# Optional if you use Stripe.js on frontend:
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxx
```

---

## 2. Create products and prices (test mode)

You need one **recurring price** per paid plan (Paid, Premium, Agency).

1. In Stripe Dashboard (test mode): **Products → Add product**.
2. For each plan, e.g. "Paid":
   - **Name:** e.g. `Paid Plan`
   - **Pricing:** Recurring, **$19/month** (or your amount).
   - Save the product.
3. Open the product → **Pricing** section.
4. Copy the **Price ID** — it looks like `price_1ABC123...` (starts with `price_`, not `prod_`).
5. Repeat for Premium ($49/mo) and Agency ($99/mo) if you use them.

---

## 3. Set Price IDs in your app

In `.env.local` set **Price** IDs (not Product IDs):

```env
# Stripe (test mode keys and Price IDs)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
STRIPE_PAID_PRICE_ID=price_xxxxxxxxxxxxxxxx
STRIPE_PREMIUM_PRICE_ID=price_xxxxxxxxxxxxxxxx
STRIPE_AGENCY_PRICE_ID=price_xxxxxxxxxxxxxxxx

# For success/cancel redirects
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Restart the dev server after changing env.

---

## 4. Test with a dummy card

With test mode and the correct **price_** IDs in env:

1. Go to **Billing** in your app and click **Upgrade** on a paid plan.
2. You should be redirected to Stripe Checkout.
3. Use Stripe’s test card:
   - **Card number:** `4242 4242 4242 4242`
   - **Expiry:** any future date (e.g. `12/34`)
   - **CVC:** any 3 digits (e.g. `123`)
   - **ZIP:** any (e.g. `12345`)

4. Complete checkout. You should be redirected back to your app with `?success=true` and see "Subscription started. Welcome!".

Other test cards (e.g. decline, 3D Secure): [Stripe test cards](https://docs.stripe.com/testing#cards).

---

## 5. Webhook (optional, for subscription sync)

To keep `subscriptions` in your DB in sync when a user upgrades or cancels:

1. **Developers → Webhooks → Add endpoint**
   - URL: `https://your-domain.com/api/stripe/webhook` (or for local: use Stripe CLI, see below).
2. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Copy the **Signing secret** (`whsec_...`) and set in `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
   ```

**Local testing:** Use [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

---

## Quick checklist

| Step | Action |
|------|--------|
| 1 | Stripe Dashboard → Test mode ON |
| 2 | Create products with recurring prices; copy **Price** IDs (`price_...`) |
| 3 | Set `STRIPE_PAID_PRICE_ID`, etc., to those **price_** IDs in `.env.local` |
| 4 | Restart dev server, click Upgrade → use card `4242 4242 4242 4242` |
| 5 | (Optional) Configure webhook + `STRIPE_WEBHOOK_SECRET` for DB sync |

Once the env uses **price_** IDs and test keys, the "No such price" error goes away and you can test the full payment flow with the dummy card.

---

## Troubleshooting

### "No completed checkout found" when clicking Refresh subscription status

- The app looks up your **Stripe Checkout** session using your account and only finds sessions that have your **user ID** stored as `client_reference_id`. That is set when you start checkout from this app.
- **Do this:** Run a **new** test checkout from this app (Billing → Upgrade → pay with `4242...`). After Stripe redirects you back, click **Refresh subscription status** again. The new session will be found and your plan will update.
- Ensure you’re in **Stripe test mode** and that `STRIPE_SECRET_KEY` in `.env.local` is the **test** secret key (`sk_test_...`) for the same Stripe account.

### Plan shows "Paid" on Billing but creating a chatbot still says limit reached

- The **chatbots** API reads your plan from the **subscriptions** table (via `getUserPlan`). If the UI shows Paid but the API still returns the limit error, the DB row may be missing or wrong.
- **Do this:** Click **Refresh subscription status** on Billing so the app syncs from Stripe again. Then try creating a chatbot.
- If it still fails, check the **server logs** when you click Refresh. If you see `[stripe/sync-subscription] insert failed` or `update failed` with a message like "duplicate key" or "column does not exist", fix the `subscriptions` table (see `supabase/subscriptions-table.sql`) and run the migration if needed.

### Manually set plan for testing (no Stripe)

To force a user to the **paid** plan in the DB (e.g. to test limits without Stripe):

1. In Supabase: **SQL Editor**.
2. Get the user’s ID from **Authentication → Users** (or from your app’s auth).
3. Run (replace `USER_UUID` with the real UUID):

```sql
-- If you have no row yet for this user:
insert into public.subscriptions (user_id, plan, status, updated_at)
values ('USER_UUID', 'paid', 'active', now());

-- If you already have a row for this user:
update public.subscriptions
set plan = 'paid', status = 'active', updated_at = now()
where user_id = 'USER_UUID';
```

Then reload Billing and try creating a chatbot again.
