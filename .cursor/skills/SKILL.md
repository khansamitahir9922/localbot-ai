
[citation:6][citation:7][citation:9]

---

## ⚙️ PART 3: CURSOR IDE SETTINGS (Manual Configuration)

**📍 LOCATION:** `Cursor → Settings → Cursor Settings → Models`

### ✅ CRITICAL SETTING: ENABLE THINKING MODEL

1. **Disable "Auto-select model"** – this is crucial. [citation:6]
2. **Enable "Thinking" mode**
3. **Select:** `claude-3.7-sonnet` (for planning/architecture)
4. **For execution:** GPT-5.1 or Claude 3.5 Sonnet (faster)

**Why:** Non-thinking models spit out the first solution. Thinking models generate possible solutions, analyze them, and select the best one. You can also "see" what the model is considering. [citation:6]

---

## 📁 PART 4: SKILLS (`.cursor/skills/SKILL.md`)

**📍 LOCATION:** `.cursor/skills/SKILL.md`

**What are Skills?**  
Skills are **procedural "how-to" instructions** that the agent can dynamically discover and apply via `/slash` commands. Unlike always-on Rules, Skills are **contextual** – they only activate when relevant. [citation:2][citation:8]

```markdown
# LOCALBOT AI – CURSOR SKILLS

## 🚀 /deploy-vercel
**Description:** Deploy the current branch to Vercel production preview.
**Workflow:**
1. Run `npm run build` and verify no errors
2. Run `npm run lint` and fix any auto-fixable issues
3. Commit current changes: `git add . && git commit -m "chore: pre-deploy [skip ci]"`
4. Push to GitHub: `git push origin HEAD`
5. Wait for Vercel deployment to complete (check Vercel dashboard)
6. Return preview URL

## 🧪 /test-widget-locally
**Description:** Test the embeddable widget on a local HTML page.
**Workflow:**
1. Ensure widget bundle is built: `cd widget && node build.js && cd ..`
2. Ensure development server is running: `npm run dev`
3. Open browser to `http://localhost:3000/test-widget.html`
4. Verify chat bubble appears with correct token
5. Verify chat API responds with configured bot name/color

## 🗄️ /generate-supabase-types
**Description:** Generate TypeScript types from Supabase schema.
**Workflow:**
1. Ensure Supabase project URL and anon key are in `.env.local`
2. Run: `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts`
3. Format the generated file: `npx prettier --write src/types/supabase.ts`
4. Commit the updated types

## 🔑 /add-stripe-webhook-local
**Description:** Set up Stripe CLI to forward webhooks to localhost.
**Workflow:**
1. Check if Stripe CLI is installed: `stripe --version`
2. If not installed, guide user to install
3. Run: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy the webhook secret and add to `.env.local` as `STRIPE_WEBHOOK_SECRET`
5. Keep terminal open while testing payments

## 📊 /check-console-errors
**Description:** Run comprehensive error checking across the app.
**Workflow:**
1. TypeScript check: `npx tsc --noEmit`
2. ESLint: `npx eslint . --max-warnings 0`
3. Build check: `npm run build`
4. If errors exist, categorize and fix critical ones first
5. Report summary of findings

## 🧹 /clean-imports
**Description:** Organize and clean up imports in TypeScript files.
**Workflow:**
1. Run: `npx eslint . --fix --rule 'import/order: [2, { alphabetize: { order: asc } }]'`
2. Run: `npx prettier --write .`
3. Commit if significant changes

## 🔄 /migrate-to-v0_2-rules
**Description:** Migrate from legacy .cursorrules to .cursor/rules/*.mdc
**Workflow:**
1. Check if `.cursorrules` exists at root
2. If yes, parse content and create appropriate `.mdc` files in `.cursor/rules/`
3. Add frontmatter to each `.mdc` file with appropriate globs and alwaysApply
4. Delete `.cursorrules` file
5. Update documentation in `project-specs.md`