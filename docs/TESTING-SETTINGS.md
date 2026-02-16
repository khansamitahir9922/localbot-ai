# Testing the Settings Page

Use this checklist to verify that Settings and related APIs work as intended.

**Prerequisites:** App running (`npm run dev`), logged in, and at least one chatbot created (complete onboarding if needed).

---

## 1. Access & No-Chatbot State

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Open **Settings**: go to `/dashboard/settings` or click **Settings** in the sidebar. | Page loads; you see the Settings title and three tabs: **Bot Settings**, **Account Settings**, **Danger Zone**. |
| 1.2 | If you have **no chatbot** (e.g. use a new account with no onboarding): open `/dashboard/settings`. | Message like "No chatbot found. Create one in onboarding to manage settings." and a **Go to onboarding** button. No tabs or forms. |

**Pass:** With a chatbot you see three tabs; with no chatbot you see the empty state and onboarding link.

---

## 2. Bot Settings Tab

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | Go to **Settings** and open the **Bot Settings** tab (default). | Form shows: Bot Name, Display Name, Primary Color (color + hex), Welcome Message, Fallback Message, Widget Position (Bottom left / Bottom right). Values match your first chatbot. |
| 2.2 | Change **Display Name** to something new (e.g. "Test Assistant"), leave other fields, click **Save Changes**. | Success toast "Bot settings saved." Form stays with new value. |
| 2.3 | Reload the page. | Display Name still shows the new value (saved to DB). |
| 2.4 | Open the chat widget (on this app or your embed page). | Widget header shows the new display name. |
| 2.5 | Change **Primary Color** (e.g. pick green), click **Save Changes**. | Success toast; color is saved. |
| 2.6 | Change **Welcome Message** and **Fallback Message**, click **Save Changes**. | Success toast; both messages saved. |
| 2.7 | Switch **Widget Position** to "Bottom left", save. | Success toast. On the page where the widget is embedded, the bubble moves to bottom-left (after refresh if needed). |
| 2.8 | Click **Reset to Defaults**. | Form fields reset to: Display Name "Assistant", color #2563EB, default welcome/fallback text, Bottom right. Toast: "Form reset to defaults. Click Save to apply." |
| 2.9 | Click **Save Changes** after reset. | Success toast; GET/PATCH for this chatbot returns the default values. |
| 2.10 | Submit with **Bot Name** or **Display Name** empty. | Validation error under the empty field; no save. |
| 2.11 | (Optional) In DevTools Network: submit form and confirm **PATCH** `/api/chatbots/<id>` with correct JSON body and **200** response. | Request body contains only the fields you changed; response `{ "success": true }`. |

**Pass:** All form fields save and persist; reset works; validation blocks invalid submit; widget reflects name and color.

---

## 3. Account Settings Tab

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Open the **Account Settings** tab. | You see **Full Name** (pre-filled from profile), **Email** (read-only), and **Change Password** button. |
| 3.2 | Change **Full Name**, click **Save Name**. | Success toast "Account updated." Name updates (e.g. in sidebar or after refresh). |
| 3.3 | Reload the page. | Full Name still shows the new value (stored in auth user_metadata). |
| 3.4 | Click **Change Password**. | Dialog opens with "New Password" and "Confirm Password" fields. |
| 3.5 | Enter a short password (e.g. "123"). | Toast or validation: password must be at least 6 characters (or similar). |
| 3.6 | Enter a valid new password in **New Password**, different text in **Confirm Password**, click **Update Password**. | Toast: "Passwords do not match." (or similar). |
| 3.7 | Enter same valid new password in both fields (e.g. "newpass123"), click **Update Password**. | Success toast "Password updated..."; dialog closes. Next login must use the new password. |
| 3.8 | Confirm **Email** field is disabled / read-only. | You cannot edit email on this page. |

**Pass:** Full name updates and persists; password change enforces length and match and updates auth; email is read-only.

---

## 4. Danger Zone – Export Data

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Open the **Danger Zone** tab. | You see **Export Data**, **Delete This Chatbot**, and (if on a paid plan) **Cancel Subscription**. |
| 4.2 | Click **Export Data**. | A JSON file downloads (e.g. `chatbot-export-<id>-<date>.json`). |
| 4.3 | Open the downloaded file. | JSON contains: `exportedAt`, `chatbot` (object), `qaPairs` (array), `conversations` (array), `messages` (array). Data matches the selected chatbot. |

**Pass:** Export triggers download and file content matches the chatbot’s data.

---

## 5. Danger Zone – Delete This Chatbot

**Warning:** This removes the chatbot and all its data. Use a test chatbot or ensure you have a backup/export.

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | (Optional) Click **Export Data** first to keep a copy. | Export downloads as in section 4. |
| 5.2 | Click **Delete This Chatbot**. | Confirmation dialog: "Delete this chatbot?" with warning about permanent deletion. |
| 5.3 | Click **Cancel**. | Dialog closes; chatbot still exists. |
| 5.4 | Click **Delete This Chatbot** again, then **Delete** in the dialog. | Loading state on button; then success toast "Chatbot deleted." and redirect to `/dashboard`. |
| 5.5 | On Dashboard, check chatbot list (or Analytics dropdown). | The deleted chatbot is gone. |
| 5.6 | In Supabase (if available): check `chatbots`, `conversations`, `messages`, `qa_pairs`. | No rows for the deleted chatbot ID. |

**Pass:** Delete shows confirmation; after confirm, chatbot and related data are removed and user is redirected to dashboard.

---

## 6. Danger Zone – Cancel Subscription (paid plan only)

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | If your account is on a **paid** plan (e.g. Paid, Premium, Agency), open **Danger Zone**. | You see **Cancel Subscription** (or "Manage billing") with Stripe-related label. |
| 6.2 | Click **Cancel Subscription**. | Browser redirects to Stripe Customer Portal (or billing portal URL). You can manage/cancel the subscription there. |
| 6.3 | If your account is on **free** plan only. | **Cancel Subscription** button is **not** shown in Danger Zone. |

**Pass:** Paid users can open the portal; free users do not see the button.

---

## 7. API Checks (optional)

Use DevTools Network or a REST client (e.g. Postman) while logged in.

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/api/chatbots/<id>` | GET | 200, JSON with chatbot fields (name, bot_name, primary_color, welcome_message, fallback_message, widget_position). Replace `<id>` with a chatbot you own. |
| `/api/chatbots/<id>` | PATCH | Body: `{ "bot_name": "New Name" }`. 200 and `{ "success": true }`. Unauthorized or wrong id → 401/403/404. |
| `/api/chatbots/<id>` | DELETE | 200 and `{ "success": true }`; then chatbot and related data removed. |
| `/api/chatbots/<id>/export` | GET | 200, JSON with `chatbot`, `qaPairs`, `conversations`, `messages`. |

Use the same session cookies as the app (e.g. copy from Application → Cookies for localhost).

**Pass:** GET returns correct bot; PATCH updates and returns success; DELETE removes bot; export returns full JSON.

---

## Quick Checklist

| # | Area | Pass |
|---|------|------|
| 1 | Access & no-chatbot state | ☐ |
| 2 | Bot Settings: form, save, reset, validation, widget reflects changes | ☐ |
| 3 | Account Settings: full name, password dialog, email read-only | ☐ |
| 4 | Danger Zone: Export Data downloads correct JSON | ☐ |
| 5 | Danger Zone: Delete chatbot with confirmation and redirect | ☐ |
| 6 | Danger Zone: Cancel Subscription only for paid, redirects to portal | ☐ |
| 7 | (Optional) API GET/PATCH/DELETE/export behave as above | ☐ |

---

## Troubleshooting

- **Bot Settings don’t save:** Check Network for PATCH `/api/chatbots/<id>`. If 403, user may not own the chatbot (workspace check). If 500, check server logs and DB (e.g. column names).
- **Password change fails:** Ensure new password is at least 6 characters and that Supabase Auth allows password updates. Check for "same password" or policy errors in toast.
- **Export returns 403:** User must own the chatbot; same ownership check as other chatbot APIs.
- **Delete doesn’t remove data:** Check that DELETE runs in order: Pinecone (optional), messages, conversations, qa_pairs, chatbots. Check server logs and Supabase for errors (e.g. RLS or missing cascade).
- **Cancel Subscription not visible:** Only shown when `subscriptionPlan !== "free"` (from `subscriptions` with status active/trialing). Confirm plan in DB or after a test upgrade.
