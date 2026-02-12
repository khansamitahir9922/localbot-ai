# LocalBot AI – Project Specification

**Last Updated:** 2025-04-03  
**Status:** Initial Setup Complete – Ready for Development

---

## 1. PRODUCT OVERVIEW

LocalBot AI is a **no-code AI chatbot builder** for local businesses.  
Business owners can create, train, and embed a custom AI support chatbot on their website in under 5 minutes, with no technical skills required.

**Core Value Proposition:**  
*"Add AI Customer Support to Your Website in 5 Minutes — No Code Needed."*

**Target Customers:** Restaurants, clinics, salons, gyms, real estate, law firms, retail stores, hotels, dental clinics, auto repair shops.

**Monetization:** Freemium SaaS – Free tier with usage limits, Paid ($19/mo), Premium ($49/mo), Agency ($99/mo).

---

## 2. TECH STACK (NON‑NEGOTIABLE)

| Category          | Technology                                      |
|-------------------|-------------------------------------------------|
| Framework         | Next.js 14+ (App Router ONLY)                  |
| Language          | TypeScript (NO `.js`/`.jsx` files)             |
| Styling           | Tailwind CSS v4 + `shadcn/ui` + Radix UI       |
| Database          | Supabase (PostgreSQL, Auth, Storage, RLS)      |
| Vector DB         | Pinecone (index: `localbot-faqs`, dim: 1536)   |
| AI                | OpenAI GPT-4o-mini + text-embedding-3-small    |
| Payments          | Stripe (Checkout, Customer Portal, Webhooks)   |
| Web Scraping      | Firecrawl API                                  |
| Email             | Resend                                         |
| Analytics         | PostHog (or Plausible)                         |
| Error Tracking    | Sentry                                         |
| Deployment        | Vercel                                         |
| Version Control   | GitHub                                         |

---

## 3. PROJECT STRUCTURE

src/
├── app/
│ ├── (marketing)/ # Public pages (landing, pricing, blog)
│ ├── (auth)/ # Login, signup, password reset
│ ├── (dashboard)/ # Authenticated app (onboarding, dashboard, settings)
│ ├── api/ # All API routes
│ │ ├── chat/ # Chat endpoint (public)
│ │ ├── embeddings/ # Generate & store embeddings
│ │ ├── crawl/ # Firecrawl + Q&A extraction
│ │ ├── stripe/ # Checkout, portal, webhook
│ │ ├── handoff/ # Human handoff email
│ │ └── widget-config/ # Dynamic widget config by token
│ └── auth/callback/ # Supabase auth callback
├── components/
│ ├── ui/ # shadcn/ui components (auto‑generated)
│ ├── marketing/ # Landing page components
│ ├── dashboard/ # Dashboard components
│ ├── widget/ # Widget preview components (admin)
│ └── auth/ # Auth form components
├── lib/
│ ├── supabase/ # Supabase client (browser + server)
│ ├── openai/ # OpenAI API clients
│ ├── pinecone/ # Pinecone client
│ ├── stripe/ # Stripe utilities
│ ├── firecrawl/ # Firecrawl client
│ ├── resend/ # Email client
│ ├── tier-limits.ts # Plan limits & enforcement
│ ├── utils.ts # cn(), formatting, helpers
│ └── qa-templates.ts # Pre‑filled Q&As by business type
├── hooks/ # Custom React hooks
├── types/ # Global TypeScript types
│ └── supabase.ts # Generated Supabase types
└── middleware.ts # Auth middleware (protect /dashboard/*)


**Separate Widget Bundle** (vanilla JS, no React/Next.js):  
`/widget/` – Standalone folder with its own `package.json`, built by `esbuild` → output to `/public/widget.js`.

---

## 4. DATABASE SCHEMA (SUPABASE)

All tables have **RLS enabled** and policies restricting to authenticated user's own data.

**`workspaces`**
- `id` (uuid, primary key)
- `user_id` (references auth.users)
- `name` (text)
- `business_type` (text)
- `website_url` (text, optional)
- `language` (text, default 'en')
- `created_at` (timestamptz)

**`chatbots`**
- `id` (uuid, primary key)
- `workspace_id` (references workspaces)
- `name` (text)
- `bot_name` (text)
- `primary_color` (text, default '#2563EB')
- `welcome_message` (text)
- `fallback_message` (text)
- `widget_position` (text, default 'bottom-right')
- `embed_token` (uuid, unique)
- `show_branding` (boolean, default true)
- `created_at` (timestamptz)

**`qa_pairs`**
- `id` (uuid, primary key)
- `chatbot_id` (references chatbots)
- `question` (text)
- `answer` (text)
- `embedding` (vector(1536))
- `created_at` (timestamptz)

**`conversations`**
- `id` (uuid, primary key)
- `chatbot_id` (references chatbots)
- `session_id` (text)  # client‑generated UUID
- `created_at` (timestamptz)

**`messages`**
- `id` (uuid, primary key)
- `conversation_id` (references conversations)
- `role` (text)  # 'user' or 'assistant'
- `content` (text)
- `feedback` (boolean, nullable)  # thumbs up/down
- `created_at` (timestamptz)

**`subscriptions`**
- `id` (uuid, primary key)
- `user_id` (references auth.users)
- `stripe_customer_id` (text)
- `stripe_subscription_id` (text)
- `plan` (text)  # 'free', 'paid', 'premium', 'agency'
- `status` (text)  # 'active', 'past_due', 'canceled'
- `current_period_end` (timestamptz)
- `created_at` (timestamptz)

**`api_keys`** (Premium only)
- `id` (uuid, primary key)
- `user_id` (references auth.users)
- `name` (text)
- `key_hash` (text)  # bcrypt of the actual key
- `last_used` (timestamptz)
- `created_at` (timestamptz)

**`answer_cache`** (cost reduction)
- `id` (uuid, primary key)
- `chatbot_id` (references chatbots)
- `question_hash` (text)  # MD5 of normalized question
- `answer` (text)
- `hit_count` (integer, default 1)
- `created_at` (timestamptz)

---

## 5. TIER LIMITS

| Feature               | Free       | Paid ($19) | Premium ($49) | Agency ($99) |
|-----------------------|------------|------------|---------------|--------------|
| Chatbots              | 1          | 3          | Unlimited     | Unlimited + client workspaces |
| Q&A Pairs             | 20         | 200        | Unlimited     | Unlimited    |
| Conversations/month   | 100        | 2,000      | Unlimited     | Unlimited    |
| Team Members          | 1          | 3          | Unlimited     | Unlimited    |
| Languages             | English    | 6 languages| 6 languages   | 6 languages  |
| Branding Removal      | ❌         | ❌         | ✅            | ✅ (white‑label) |
| PDF Reports           | ❌         | ✅         | ✅            | ✅           |
| API Access            | ❌         | ❌         | ✅            | ✅           |
| Proactive Chat        | ❌         | ✅         | ✅            | ✅           |
| WhatsApp Handoff      | ❌         | ❌         | ✅            | ✅           |
| HubSpot Integration   | ❌         | ✅         | ✅            | ✅           |

---

## 6. CURSOR RULES & SKILLS

Located in `.cursor/rules/*.mdc` and `.cursor/skills/SKILL.md`.  
These rules are **enforced for all code generation**. Key requirements:

- ✅ **Complete file output** – NO `// ... existing code` or TODOs.
- ✅ **TypeScript only** – NO `.js`/`.jsx`.
- ✅ **App Router only** – NO Pages Router.
- ✅ **Tailwind + shadcn/ui** – NO CSS modules or styled‑components.
- ✅ **Supabase Auth + RLS** – NO NextAuth.js.
- ✅ **Ownership verification** on every mutation.
- ✅ **Mobile‑first, dark mode supported.**
- ✅ **Thinking model enabled** – plan before coding.

---

## 7. DEVELOPMENT PHASES (PER BUILD PLAN)

We are currently in **Phase 1, Week 1**.  
The full 22‑week plan is documented in `LocalBot_AI_Build_Plan.docx`.  

**Immediate next steps:**
1. Install all dependencies (Week 1, Step 1.3)
2. Configure Supabase client & middleware (Week 1, Step 1.4–1.5)
3. Run the database schema SQL (Week 1, Step 1.6)

---

## 8. ENVIRONMENT VARIABLES

All secrets are stored in `.env.local` (never committed).  
Required variables are listed in `.env.local.template` (to be created later).  

Current `.env.local` is properly populated and verified.

---

*This document is the single source of truth for LocalBot AI. Update it whenever architecture, dependencies, or major features change.*

