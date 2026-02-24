import Link from "next/link";
import { Bot, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Pricing – LocalBot AI",
  description: "Plans and pricing for LocalBot AI. Free forever plan, then Paid, Premium, and Agency.",
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "1 chatbot, 20 Q&As, 100 conversations/month",
    features: ["1 chatbot", "20 Q&As", "100 conversations/month", "Embed on your site"],
    cta: "Get started free",
    href: "/signup",
    highlighted: false,
  },
  {
    id: "paid",
    name: "Paid",
    price: 19,
    description: "3 chatbots, 200 Q&As, 2K conversations/month",
    features: ["3 chatbots", "200 Q&As", "2K conversations/month", "Everything in Free"],
    cta: "Get started",
    href: "/signup",
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 49,
    description: "Unlimited chatbots & Q&As, PDF reports, API access",
    features: ["Unlimited chatbots & Q&As", "PDF reports", "API access", "Everything in Paid"],
    cta: "Get started",
    href: "/signup",
    highlighted: false,
  },
  {
    id: "agency",
    name: "Agency",
    price: 99,
    description: "Everything in Premium + client workspaces, white-label",
    features: ["Client workspaces", "White-label", "Everything in Premium"],
    cta: "Get started",
    href: "/signup",
    highlighted: false,
  },
];

export default function PricingPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login" className="text-[#1E3A5F]">Log In</Link>
            </Button>
            <Button size="sm" asChild className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              <Link href="/signup">Sign Up Free</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#1E3A5F] sm:text-4xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-2 text-slate-600">
            Start free. Upgrade when you need more chatbots or conversations.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`flex flex-col border-slate-200 ${
                plan.highlighted ? "ring-2 ring-[#2563EB]" : ""
              }`}
            >
              {plan.highlighted && (
                <div className="border-b border-slate-200 bg-[#2563EB]/5 px-6 py-2 text-center text-sm font-medium text-[#2563EB]">
                  Most popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription className="min-h-[2.5rem]">
                  {plan.description}
                </CardDescription>
                <div className="text-2xl font-bold text-[#1E3A5F]">
                  {plan.price === 0 ? "$0" : `$${plan.price}/mo`}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-sm text-slate-600">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-[#2563EB]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  className={`w-full ${
                    plan.highlighted
                      ? "bg-[#2563EB] hover:bg-[#1d4ed8]"
                      : "bg-slate-800 hover:bg-slate-700"
                  }`}
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/dashboard/billing" className="font-medium text-[#2563EB] hover:underline">
            Manage billing
          </Link>
        </p>
      </main>
    </div>
  );
}
