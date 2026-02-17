import Link from "next/link";
import { Bot, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Docs – LocalBot AI",
  description: "Documentation for LocalBot AI.",
};

export default function DocsPage(): React.JSX.Element {
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
          <BookOpen className="size-8 text-[#2563EB]" />
          Docs
        </h1>
        <p className="mt-2 text-slate-600">
          Documentation is coming soon. For now, check <Link href="/help" className="text-[#2563EB] hover:underline">Help & FAQ</Link> or <Link href="/contact" className="text-[#2563EB] hover:underline">contact us</Link>.
        </p>

        <div className="mt-12 border-t border-slate-200 pt-8">
          <Button variant="outline" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
