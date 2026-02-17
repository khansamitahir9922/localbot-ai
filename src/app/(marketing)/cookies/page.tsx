import Link from "next/link";
import { Bot, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Cookie Policy – LocalBot AI",
  description: "How LocalBot AI uses cookies and similar technologies.",
};

export default function CookiesPage(): React.JSX.Element {
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
        <h1 className="text-3xl font-bold tracking-tight text-[#1E3A5F] sm:text-4xl">
          Cookie Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="prose prose-slate mt-10 max-w-none prose-headings:font-semibold prose-headings:text-[#1E3A5F] prose-p:text-slate-600 prose-li:text-slate-600">
          <p className="lead">
            This Cookie Policy explains how LocalBot AI uses cookies and similar technologies when you use our website and service.
          </p>

          <h2 className="mt-10 text-xl">What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences, keep you logged in, and understand how the site is used.
          </p>

          <h2 className="mt-10 text-xl">Cookies We Use</h2>
          <ul>
            <li><strong>Strictly necessary:</strong> Required for the site to work (e.g. authentication, security). These cannot be disabled if you want to use the service.</li>
            <li><strong>Functional:</strong> Remember your settings (e.g. theme, language) and improve your experience.</li>
            <li><strong>Analytics:</strong> Help us understand how visitors use our website (e.g. pages visited, time on site) in an aggregated way so we can improve the product.</li>
          </ul>
          <p>
            Our embeddable chatbot widget may store local data (e.g. session ID, cached config) in your browser so the chat works correctly on your site. This is described in our <Link href="/privacy" className="text-[#2563EB] hover:underline">Privacy Policy</Link>.
          </p>

          <h2 className="mt-10 text-xl">Managing Cookies</h2>
          <p>
            You can control or delete cookies through your browser settings. Disabling certain cookies may limit some features of our website or the chatbot widget.
          </p>

          <h2 className="mt-10 text-xl">Updates</h2>
          <p>
            We may update this Cookie Policy from time to time. The &quot;Last updated&quot; date at the top reflects the latest version.
          </p>

          <h2 className="mt-10 text-xl">Contact</h2>
          <p>
            Questions? Contact us at{" "}
            <a href="mailto:localBot_AI@gmail.com" className="text-[#2563EB] hover:underline">
              localBot_AI@gmail.com
            </a>
            .
          </p>
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
