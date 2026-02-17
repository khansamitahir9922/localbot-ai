import Link from "next/link";
import { Bot, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Roadmap – LocalBot AI",
  description: "Planned features and direction for LocalBot AI.",
};

export default function RoadmapPage(): React.JSX.Element {
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
          Roadmap
        </h1>
        <p className="mt-2 text-slate-600">
          Planned features and where we&apos;re headed.
        </p>

        <div className="mt-10 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-[#1E3A5F]">In the pipeline</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
              <li>More widget themes and customization</li>
              <li>Integrations (e.g. CRM, email)</li>
              <li>Multi-language support</li>
              <li>Advanced analytics and reporting</li>
            </ul>
          </section>
          <p className="text-sm text-slate-500">
            Have a feature request? <Link href="/contact" className="text-[#2563EB] hover:underline">Contact us</Link>.
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
