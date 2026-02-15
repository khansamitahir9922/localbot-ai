# How LocalBot AI Works – Quick Explanation

## What is LocalBot AI?

LocalBot AI is a **platform for you (the creator)** to build and manage AI chatbots, then **embed them on other websites** (your business site, client sites, etc.).

- **You** log in to LocalBot AI → create chatbots, add Q&A, see analytics, manage billing.
- **Your visitors** never log in here. They only see the **chat bubble on the website where you embedded the widget** (e.g. your restaurant site, your client’s site).

So there are two different “places”:

| Place | Who sees it | What it is |
|-------|-------------|------------|
| **LocalBot AI app** (this repo: Dashboard, Analytics, Settings, Billing, Knowledge Base) | **Only you** (and anyone who has an account and logs in – they see their own bots) | The **control panel** where you create and manage chatbots |
| **Your other websites** (where you paste the embed code) | **Everyone** who visits that website | The **chat widget** (the bubble and chat window) – one bot per site (or per embed code) |

---

## Why do I see “khabay di saji Assistant” on Analytics but “tahir dopatta Assistant” in the chat bubble?

Because **two different things** are on the screen at once:

1. **Analytics page content**  
   The dropdown and numbers are for **the bot you selected** in the dropdown (e.g. “khabay di saji Assistant”). So the **metrics** you see are for that bot.

2. **The chat bubble on this app**  
   The floating widget on the LocalBot AI app itself is **one fixed bot**, loaded from the app’s **root layout** with a single `data-token`. That token is set in code (e.g. in `src/app/layout.tsx`) and currently points to **one** of your chatbots (e.g. “tahir dopatta Assistant”). So no matter which bot you pick in the Analytics dropdown, the bubble on this app will still show that one bot until you change or remove the token in the layout.

So:

- **Analytics dropdown** = “Which bot’s **data** am I looking at?” → e.g. khabay di saji.
- **Chat bubble on this app** = “Which bot is **embedded on this app for testing**?” → e.g. tahir dopatta (hardcoded in layout).

That’s why the names can be different. It’s normal.

---

## Do I need to use Inspect / change “data-id” to switch the bot?

**No.** You don’t switch bots by editing the page in Inspect.

- **On the LocalBot AI app:**  
  The widget on this app is controlled by the **embed token in the code** (`src/app/layout.tsx`). To show a different bot here, change that token (or remove the script to hide the widget).
- **On your other websites:**  
  Each website has its own embed code (the `<script data-token="...">` you copied from LocalBot AI). To show a different bot on a site, paste the **embed code for that bot** (different token) on that site. No Inspect needed.

So: **which bot appears** is decided by **which token** is in the script tag on that page, not by the Analytics dropdown or Inspect.

---

## Are my chatbots “for other websites”? How can they be “online”?

- **Yes** – each chatbot you create is meant to be **embedded on a website** (yours or a client’s) via the embed code.
- **“Online”** in the app means: “Can the LocalBot AI **backend** answer requests for this bot’s config?”  
  When we check “Online”, we call the same backend that the widget uses. If your app is running and the token is valid, that bot is “online” even if it’s not embedded anywhere yet. So:
  - **Online** = backend is up and this bot’s config can be loaded (ready to be used on any site where you put its embed code).
  - It does **not** mean “this bot is only for one specific website.” One bot can be embedded on one or many sites; “online” is about your LocalBot AI server, not about a specific website.

So “for other websites” = you **use** them on other sites; “online” = **your LocalBot AI app** is serving that bot correctly.

---

## When I log in, do I see only one bot or all the bots I created?

**You see all the chatbots you created** (for all your projects/sites/clients).  
When you log in:

- You see **your** Dashboard, Analytics, Knowledge Base, Settings, Billing.
- You see **all your bots** in lists and dropdowns (e.g. “khabay di saji Assistant”, “tahir dopatta Assistant”).
- Each bot can be embedded on a **different** website (or the same one with different tokens).  
So one login = one creator account = all bots you created. You choose which bot’s analytics/settings you’re looking at via dropdowns.

---

## Is this a tool for creating chatbots for other websites? Why Dashboard, Analytics, Settings?

**Yes.** LocalBot AI is a **tool for you** to:

- Create chatbots for **your own or other websites**.
- **Dashboard** – overview of your bots and usage.
- **Analytics** – conversations, messages, top questions, unanswered, per bot.
- **Settings** – your account/app settings.
- **Billing** – your plan and limits.

So:

- **Dashboard, Analytics, Settings, Billing** = for **you**, the person who builds and manages the bots.
- **The chat widget** = for **visitors** on the sites where you embedded it. They never see Dashboard/Analytics; they only see the bubble and chat.

---

## Who sees this interface (Dashboard, Analytics, etc.)?

- **Only people who have an account and log in** to LocalBot AI see this interface.
- **Each login sees their own data**: their own chatbots, their own analytics, their own billing.
- **Visitors on your other websites** do **not** see this. They only see the chat widget on the page they’re on.

So: this interface is **only for the creator** (you and any other team members who have accounts), not for everyone on the internet.

---

## Summary

| Question | Short answer |
|----------|----------------|
| Why different names on Analytics vs chat bubble? | Analytics = which bot’s **data** you’re viewing. Bubble on this app = **one bot** hardcoded in the app layout. |
| Change bot via Inspect / data-id? | No. Change the **embed token** in the layout (for this app) or use the correct embed code on each website. |
| Are bots “for other websites”? | Yes – you embed them on other sites. “Online” means your backend serves that bot, not “only one website.” |
| One bot or all my bots when I log in? | You see **all** bots you created; dropdowns let you pick which one’s analytics/settings to view. |
| Why Dashboard / Analytics / Settings? | They’re for **you** (the creator), not for visitors. Visitors only see the widget on the sites where you embedded it. |
| Who sees this interface? | Only **logged-in users** of LocalBot AI, and each sees **their own** bots and data. |

If you want the chat bubble **on the LocalBot AI app** to always match the bot you selected (e.g. in Analytics), that would require a code change so the widget’s token is driven by the selected bot instead of a single hardcoded token in the layout.
