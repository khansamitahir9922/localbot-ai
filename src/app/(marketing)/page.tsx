import Link from "next/link";
import {
  MessageSquare,
  Globe,
  Zap,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Bot,
  Menu,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/** Set in .env.local as NEXT_PUBLIC_DEMO_VIDEO_URL (e.g. https://www.youtube.com/embed/VIDEO_ID) to show your demo video. */
const DEMO_VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ?? "";

/**
 * Marketing homepage for LocalBot AI.
 * Renders the public landing page at "/" with a navbar, hero section,
 * feature highlights, trust indicators, and a final CTA.
 */
export default function MarketingHomePage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-white">
      {/* ───────────────────────── NAVBAR ───────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Bot className="size-7 text-[#2563EB]" />
            <span className="text-xl font-bold tracking-tight text-[#1E3A5F]">
              LocalBot AI
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-6 md:flex">
            <Link
              href="#see-it-in-action"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-[#1E3A5F]"
            >
              See Demo
            </Link>
            <Link
              href="#features"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-[#1E3A5F]"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-[#1E3A5F]"
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-[#1E3A5F]"
            >
              Pricing
            </Link>
          </div>

          {/* Auth buttons */}
          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" asChild>
              <Link href="/login" className="text-[#1E3A5F]">
                Log In
              </Link>
            </Button>
            <Button asChild className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              <Link href="/signup">Sign Up Free</Link>
            </Button>
          </div>

          {/* Mobile menu button (visible on small screens) */}
          <div className="flex items-center md:hidden">
            <MobileNav />
          </div>
        </nav>
      </header>

      <main>
        {/* ───────────────────────── HERO ───────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8">
          {/* Decorative background blobs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 left-1/2 -z-10 -translate-x-1/2"
          >
            <div className="h-[500px] w-[900px] rounded-full bg-[#2563EB]/5 blur-3xl" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-1.5 text-sm font-medium text-[#2563EB]">
              <Zap className="size-3.5" />
              No-code AI chatbot builder
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#1E3A5F] sm:text-5xl lg:text-6xl">
              Add AI Customer Support to Your Website in{" "}
              <span className="text-[#2563EB]">5 Minutes</span>
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              Create a custom AI chatbot trained on your business — no
              technical skills needed. Answer customer questions 24/7, reduce
              support costs, and never miss a lead.
            </p>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="h-12 w-full rounded-lg bg-[#2563EB] px-8 text-base font-semibold shadow-lg shadow-[#2563EB]/25 transition-all hover:bg-[#1d4ed8] hover:shadow-xl hover:shadow-[#2563EB]/30 sm:w-auto"
              >
                <Link href="/signup">
                  Create My Free Chatbot
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 w-full rounded-lg border-slate-300 px-8 text-base font-semibold text-[#1E3A5F] hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5 sm:w-auto"
              >
                <Link href="#see-it-in-action">Watch Demo</Link>
              </Button>
            </div>

            {/* Trust line */}
            <p className="mt-6 text-sm text-slate-500">
              Free forever plan &middot; No credit card required &middot; Setup
              in under 5 minutes
            </p>
          </div>
        </section>

        {/* ──────────────────── VIDEO: SEE IT IN ACTION ──────────────────── */}
        <section
          id="see-it-in-action"
          className="border-t border-slate-100 bg-slate-50 px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#1E3A5F] sm:text-4xl">
                See LocalBot AI in Action
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                Watch how easy it is to create your AI chatbot, add your
                knowledge base, and embed it on your website — no coding
                required.
              </p>
            </div>

            <div className="mt-12">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50">
                {DEMO_VIDEO_URL ? (
                  <div className="relative aspect-video w-full bg-slate-900">
                    <iframe
                      src={DEMO_VIDEO_URL}
                      title="LocalBot AI demo video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 size-full"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-100 to-slate-200 px-6 text-center">
                    <div className="flex size-20 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/30 transition-transform hover:scale-105">
                      <Play className="size-10 ml-1" fill="currentColor" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#1E3A5F]">
                        Your demo video goes here
                      </p>
                      <p className="mt-1 max-w-md text-sm text-slate-600">
                        Add a short video showing your chatbot: how to sign up,
                        add Q&A, and embed the widget. Set{" "}
                        <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">
                          NEXT_PUBLIC_DEMO_VIDEO_URL
                        </code>{" "}
                        in .env.local with your YouTube or Vimeo embed URL.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────────── FEATURES GRID ──────────────────── */}
        <section
          id="features"
          className="border-t border-slate-100 bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#1E3A5F] sm:text-4xl">
                Everything You Need to Automate Customer Support
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                Built for restaurants, clinics, salons, gyms, law firms, and
                every local business that deserves great support.
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<MessageSquare className="size-6 text-[#2563EB]" />}
                title="AI-Powered Chat"
                description="GPT-4o-mini answers questions using your business knowledge base. Accurate, conversational, and always on brand."
              />
              <FeatureCard
                icon={<Globe className="size-6 text-[#2563EB]" />}
                title="Website Auto-Training"
                description="Paste your URL and we'll crawl your website to build the chatbot's knowledge — no manual data entry."
              />
              <FeatureCard
                icon={<Zap className="size-6 text-[#2563EB]" />}
                title="5-Minute Setup"
                description="Pick your business type, customize the widget, copy one line of code, and you're live. Dead simple."
              />
              <FeatureCard
                icon={<BarChart3 className="size-6 text-[#2563EB]" />}
                title="Analytics Dashboard"
                description="Track conversations, popular questions, customer satisfaction, and discover gaps in your knowledge base."
              />
              <FeatureCard
                icon={<CheckCircle2 className="size-6 text-[#2563EB]" />}
                title="Custom Q&A Pairs"
                description="Add, edit, or delete questions and answers at any time. Your chatbot gets smarter as you refine it."
              />
              <FeatureCard
                icon={<Bot className="size-6 text-[#2563EB]" />}
                title="Fully Branded Widget"
                description="Match your brand colors, set a custom welcome message, and position the widget anywhere on your site."
              />
            </div>
          </div>
        </section>

        {/* ─────────────────── HOW IT WORKS ─────────────────── */}
        <section
          id="how-it-works"
          className="border-t border-slate-100 bg-slate-50 px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#1E3A5F] sm:text-4xl">
                Go Live in 3 Simple Steps
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
                No developers. No meetings. No headaches.
              </p>
            </div>

            <div className="mt-16 grid gap-10 sm:grid-cols-3">
              <StepCard
                step="1"
                title="Describe Your Business"
                description="Tell us your business type and paste your website URL. We'll auto-generate relevant Q&A pairs."
              />
              <StepCard
                step="2"
                title="Customize Your Bot"
                description="Set your brand colors, welcome message, and review the generated answers. Edit anything you want."
              />
              <StepCard
                step="3"
                title="Embed & Go Live"
                description="Copy a single script tag, paste it into your website, and your AI chatbot is live instantly."
              />
            </div>
          </div>
        </section>

        {/* ──────────────────── FINAL CTA ──────────────────── */}
        <section className="border-t border-slate-100 bg-[#1E3A5F] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to Automate Your Customer Support?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
              Join hundreds of local businesses already using LocalBot AI to
              answer customer questions instantly.
            </p>
            <div className="mt-10">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-lg bg-[#2563EB] px-8 text-base font-semibold shadow-lg shadow-black/20 transition-all hover:bg-[#1d4ed8] hover:shadow-xl"
              >
                <Link href="/signup">
                  Create My Free Chatbot
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Free plan available &middot; No credit card needed
            </p>
          </div>
        </section>

        {/* ───────────────────────── FOOTER ───────────────────────── */}
        <footer className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-[#2563EB]" />
              <span className="text-sm font-semibold text-[#1E3A5F]">
                LocalBot AI
              </span>
            </div>

            <div className="flex items-center gap-6">
              <Link
                href="#see-it-in-action"
                className="text-sm text-slate-500 transition-colors hover:text-[#1E3A5F]"
              >
                See Demo
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-slate-500 transition-colors hover:text-[#1E3A5F]"
              >
                Pricing
              </Link>
              <Link
                href="#features"
                className="text-sm text-slate-500 transition-colors hover:text-[#1E3A5F]"
              >
                Features
              </Link>
              <Link
                href="/login"
                className="text-sm text-slate-500 transition-colors hover:text-[#1E3A5F]"
              >
                Log In
              </Link>
            </div>

            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} LocalBot AI. All rights
              reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUBCOMPONENTS – Colocated for simplicity; extract when reuse grows.
   ═══════════════════════════════════════════════════════════════════ */

/**
 * A single feature highlight card with an icon, title, and description.
 */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-[#2563EB]/20 hover:shadow-md">
      <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-[#2563EB]/10">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[#1E3A5F]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {description}
      </p>
    </div>
  );
}

/**
 * A numbered step card for the "How It Works" section.
 */
function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#2563EB] text-xl font-bold text-white shadow-lg shadow-[#2563EB]/25">
        {step}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-[#1E3A5F]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {description}
      </p>
    </div>
  );
}

/**
 * Mobile navigation dropdown. Uses native <details> for a zero-JS
 * disclosure that works in Server Components without client-side hydration.
 */
function MobileNav(): React.JSX.Element {
  return (
    <details className="group relative">
      <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md hover:bg-slate-100">
        <Menu className="size-5 text-[#1E3A5F]" />
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
        <Link
          href="#see-it-in-action"
          className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          See Demo
        </Link>
        <Link
          href="#features"
          className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Features
        </Link>
        <Link
          href="#how-it-works"
          className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          How It Works
        </Link>
        <Link
          href="/pricing"
          className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Pricing
        </Link>
        <div className="my-2 border-t border-slate-100" />
        <Link
          href="/login"
          className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Log In
        </Link>
        <Link
          href="/signup"
          className="block rounded-md px-3 py-2 text-sm font-medium text-[#2563EB] hover:bg-[#2563EB]/5"
        >
          Sign Up Free
        </Link>
      </div>
    </details>
  );
}
