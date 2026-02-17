import Link from "next/link";
import { Bot, ArrowLeft, Mail, MessageCircle, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Contact – LocalBot AI",
  description: "Get in touch with LocalBot AI. Email, WhatsApp, and social links.",
};

const year = new Date().getFullYear();

export default function ContactPage(): React.JSX.Element {
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
          Contact Us
        </h1>
        <p className="mt-2 text-slate-600">
          Have a question or need help? Reach out via email or WhatsApp.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-1">
          <a
            href="mailto:localBot_AI@gmail.com"
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5 transition hover:border-[#2563EB] hover:bg-blue-50/50"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-[#2563EB]/10">
              <Mail className="size-6 text-[#2563EB]" />
            </div>
            <div>
              <p className="font-medium text-[#1E3A5F]">Email</p>
              <p className="text-slate-600">localBot_AI@gmail.com</p>
            </div>
          </a>
          <a
            href="https://wa.me/923109080328"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5 transition hover:border-green-600 hover:bg-green-50/50"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
              <MessageCircle className="size-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-[#1E3A5F]">WhatsApp</p>
              <p className="text-slate-600">+92 310 9080328</p>
            </div>
          </a>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-[#1E3A5F]">Follow us</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          <a
            href="https://instagram.com/LocalBot_AI"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-pink-400 hover:text-pink-600"
          >
            <Instagram className="size-5" />
            LocalBot_AI
          </a>
          <a
            href="https://facebook.com/LocalBot_AI"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-blue-600 hover:text-blue-600"
          >
            <Facebook className="size-5" />
            LocalBot_AI
          </a>
        </div>

        <p className="mt-8 text-sm text-slate-500">
          © {year} LocalBot AI. Built by{" "}
          <a href="mailto:khansamitahir9922@gmail.com" className="text-[#2563EB] hover:underline">
            Abdul Sami
          </a>
          .
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
