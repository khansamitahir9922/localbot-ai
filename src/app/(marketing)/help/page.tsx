import Link from "next/link";
import { Bot, ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Help & FAQ – LocalBot AI",
  description: "Frequently asked questions and help for LocalBot AI.",
};

export default function HelpPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" className="gap-2 text-slate-600 hover:text-[#1E3A5F]">
              <ArrowLeft className="size-4" />
              Home
            </Link>
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <Bot className="size-6 text-[#2563EB]" />
            <span className="font-semibold text-[#1E3A5F]">LocalBot AI</span>
          </Link>
          <div className="w-20" />
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-[#1E3A5F] sm:text-4xl">
          <HelpCircle className="size-8 text-[#2563EB]" />
          Help & FAQ
        </h1>
        <p className="mt-2 text-slate-600">
          Common questions and how to get support.
        </p>

        <div className="mt-10 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-[#1E3A5F]">How do I create a chatbot?</h2>
            <p className="mt-1 text-slate-600">
              Sign up, create a new bot, and add questions and answers to the knowledge base. Then copy the embed code and add it to your website.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#1E3A5F]">Where do I get the embed code?</h2>
            <p className="mt-1 text-slate-600">
              In your dashboard, open your bot and go to the &quot;Embed&quot; or &quot;Install&quot; section. Copy the script tag and paste it before the closing &lt;/body&gt; of your site.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#1E3A5F]">How is billing handled?</h2>
            <p className="mt-1 text-slate-600">
              We use Stripe for payments. You can upgrade, downgrade, or cancel from the dashboard. Invoices are sent to your account email.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#1E3A5F]">I need more help</h2>
            <p className="mt-1 text-slate-600">
              Reach out via <Link href="/contact" className="text-[#2563EB] hover:underline">Contact</Link> (email or WhatsApp). We&apos;ll get back to you as soon as we can.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-8">
          <Button variant="outline" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
