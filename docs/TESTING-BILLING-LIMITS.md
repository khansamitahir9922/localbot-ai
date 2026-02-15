# Testing Billing & Tier Limits

This guide walks through testing all billing/limits features: usage display, limit enforcement (chatbots, Q&A pairs, conversations), and upgrade CTAs.

**Free tier limits (used in tests):**

| Resource              | Free limit |
|-----------------------|------------|
| Chatbots              | 1          |
| Q&A pairs (total)     | 20         |
| Conversations / month | 100        |

---

## Prerequisites

1. **App running**
   - `npm run dev` (or your usual start command).
   - Log in as a test user.

2. **Database**
   - Supabase (or your DB) has:
     - `subscriptions` table (user plan; if missing or no row, user is treated as **free**).
     - `chatbots`, `workspaces`, `workspace_members`, `qa_pairs`, `conversations` (or equivalent) for counts.

3. **Optional: force a plan for testing**
   - To test **paid** limits (e.g. 3 chatbots, 200 Q&A), insert/update a row in `subscriptions` for your test user with `plan = 'paid'` and `status` in `('active','trialing')`.
   - Leave no row (or `plan = 'free'`) to test free limits.

---

## 1. Dashboard usage bars

**Goal:** Confirm the dashboard shows plan usage (chatbots, Q&A pairs, conversations this month) and an upgrade link.

**Steps:**

1. Log in and open the **Dashboard** (e.g. `/dashboard` or main dashboard after selecting a workspace).
2. Find the **“Plan usage”** (or similar) card.
3. **Verify:**
   - Three progress bars (or equivalent) with labels:
     - **Chatbots:** e.g. “1 / 1” (or “X / 1” for free).
     - **Q&A pairs:** e.g. “0 / 20” (or “X / 20” for free).
     - **Conversations this month:** e.g. “0 / 100” (or “X / 100” for free).
   - An **“Upgrade plan”** (or similar) link that goes to `/dashboard/billing` (or your billing page).

**Pass:** Numbers match your current usage and plan limits; link opens billing.

---

## 2. Chatbot limit – onboarding upgrade prompt

**Goal:** When the user is already at the chatbot limit (free = 1), creating another chatbot is blocked and the upgrade CTA is shown.

**Steps:**

1. **Reach the limit**
   - Ensure the test user already has **1 chatbot** (free limit). Create one via onboarding if needed.
2. Start **creating a new chatbot** again (e.g. go to onboarding or “Create chatbot”).
3. Complete the steps until the final step that **creates** the chatbot (e.g. “Deploy” / “Create”).
4. Click the button that triggers creation (e.g. “Deploy”).
5. **Verify:**
   - Request returns **403** (or the UI shows an error).
   - Error message indicates the chatbot limit is reached.
   - UI shows an **“Upgrade plan”** (or similar) button/link that goes to `/dashboard/billing` (not only “Try again”).

**Pass:** Cannot create a second chatbot; upgrade CTA is visible and links to billing.

---

## 3. Knowledge Base – usage bar and “approaching limit” warning

**Goal:** Knowledge Base shows Q&A usage (X / Y) and warns when approaching or at the limit.

**Steps:**

1. Open **Knowledge Base** for a chatbot that has some Q&A pairs (e.g. 5–15 for “approaching”).
2. **Verify usage bar:**
   - A progress bar or text like **“X / 20 Q&A pairs used”** (for free) is visible.
   - After adding a pair (see step 4 below), the number updates **without reloading** the page (e.g. 6 / 20).
3. **Approaching limit (e.g. 16–19 pairs for free):**
   - Add pairs until you have **16–19** (or ≥ 80% of limit).
   - An **amber/warning** card or message appears (e.g. “Approaching Q&A limit”).
   - It includes an **“Upgrade plan”** link to billing.
4. **At limit (20 for free):**
   - Add pairs until you have **20** (or 100% of limit).
   - A **red/error** card or message appears (e.g. “At Q&A limit”).
   - It includes an **“Upgrade plan”** link.

**Pass:** Usage bar is correct and updates after add; approaching and at-limit warnings and upgrade links appear as described.

---

## 4. Q&A pair limit – API block and upgrade CTA

**Goal:** Adding a Q&A pair when already at the limit returns 403 and the UI offers upgrade.

**Steps:**

1. Ensure the user is at the **Q&A limit** (e.g. 20 pairs for free). Use Knowledge Base to add pairs until the bar shows “20 / 20”.
2. Try to **add one more** Q&A pair (single “Add” or similar).
3. **Verify:**
   - The add request (POST to `/api/qa-pairs`) returns **403**.
   - Response body includes a code like `LIMIT_QA_PAIRS` and a message about the limit.
   - UI shows a toast or inline error with an **“Upgrade”** (or similar) action that opens `/dashboard/billing`.
4. Optionally try **bulk add** (templates or crawl import) at limit:
   - Same behavior: **403** and upgrade CTA.

**Pass:** API blocks add at limit; user sees error and upgrade option.

---

## 5. Conversation limit – Chat API (402)

**Goal:** When the user has used their monthly conversation allowance, the chat API returns 402 and suggests upgrading or waiting.

**Steps:**

1. **Get to the limit (100 for free):**
   - Use the chat widget (or chat API) to send **100** messages in the **current month** (UTC).  
   - Or temporarily lower the free limit in `tier-limits.ts` (e.g. to 2) and send 2 messages to speed up testing.
2. Send **one more** message (or request to the chat API).
3. **Verify:**
   - The chat request returns **402 Payment Required** (or your chosen status).
   - Response body contains a message like “conversation limit reached” and suggests upgrading or trying next month.
   - Widget/UI shows this message to the user (no generic 500).

**Pass:** After monthly limit, chat returns 402 and user sees the limit message.

---

## 6. Optional: `getUserPlan` and usage API

**Goal:** Confirm the backend resolves the user’s plan and that the usage API returns correct counts.

**Steps:**

1. **Usage API (authenticated):**
   - While logged in, open or call:  
     `GET /api/limits/usage`  
     and optionally:  
     `GET /api/limits/usage?chatbotId=<id>`.
   - **Verify:** JSON includes `plan`, `chatbotsUsed`, `chatbotsLimit`, `qaPairsUsed`, `qaPairsLimit`, `conversationsUsed`, `conversationsLimit`. Counts match what you see in the dashboard/Knowledge Base.
2. **Plan from DB:**
   - Add or update a row in `subscriptions` for the test user with `plan = 'paid'`, `status = 'active'`.
   - Reload dashboard and usage API.
   - **Verify:** Limits and usage reflect **paid** (e.g. 3 chatbots, 200 Q&A, 2000 conversations/month).

**Pass:** Usage API returns correct plan and counts; changing `subscriptions` changes plan and limits.

---

## Quick checklist

| # | Test | Pass |
|---|------|------|
| 1 | Dashboard usage bars (chatbots, Q&A, conversations) + upgrade link | ☐ |
| 2 | Onboarding: at chatbot limit → block + “Upgrade plan” CTA | ☐ |
| 3 | Knowledge Base: usage bar, approaching limit warning, at-limit warning, refresh after add | ☐ |
| 4 | Add Q&A at limit → 403 + upgrade in toast/UI | ☐ |
| 5 | Chat at monthly conversation limit → 402 + message | ☐ |
| 6 | Usage API and plan from DB (optional) | ☐ |

---

## Troubleshooting

- **Usage shows 0/0 or wrong plan**  
  Check that the user is authenticated and that `getUserPlan` is using the correct `user_id` (e.g. workspace owner for chat/conversations). Confirm `subscriptions` has the expected row for that user.

- **Creating a chatbot still works at “limit”**  
  Ensure POST create goes to `/api/chatbots` and that the API counts **all** chatbots for the user (all workspaces). Check `canAdd(plan, 'chatbots', count)` is used before insert.

- **Q&A add doesn’t block at 20**  
  Ensure add goes through POST `/api/qa-pairs` and that the API counts **total** `qa_pairs` for the user’s chatbots and compares to `getTierLimits(plan).qaPairs`.

- **Conversation limit never hits**  
  Confirm the chat API counts conversations for the **current month (UTC)** for the workspace owner’s chatbots and compares to `conversationsPerMonth`. Check that “conversation” is defined consistently (e.g. one per user message or per turn).
