import Link from "next/link";
import { Bot, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Terms of Service – LocalBot AI",
  description: "Terms of Service for using LocalBot AI.",
};

export default function TermsPage(): React.JSX.Element {
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
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="prose prose-slate mt-10 max-w-none prose-headings:font-semibold prose-headings:text-[#1E3A5F] prose-p:text-slate-600 prose-li:text-slate-600">
          <p className="lead">
            By using LocalBot AI (&quot;Service&quot;), you agree to these Terms of Service. If you do not agree, please do not use the Service.
          </p>

          <h2 className="mt-10 text-xl">1. Use of the Service</h2>
          <p>
            You may use LocalBot AI to create and operate AI chatbots on your websites. You are responsible for the content you add to your knowledge base and for ensuring that your use of the Service complies with applicable laws and does not infringe others&apos; rights.
          </p>

          <h2 className="mt-10 text-xl">2. Account and Security</h2>
          <p>
            You must provide accurate information when signing up and keep your account credentials secure. You are responsible for all activity under your account. Notify us promptly at localBot_AI@gmail.com if you suspect unauthorized access.
          </p>

          <h2 className="mt-10 text-xl">3. Acceptable Use</h2>
          <p>
            You may not use the Service to: (a) violate any law or regulation; (b) infringe intellectual property or other rights; (c) distribute malware or abuse systems; (d) send spam or deceptive content; or (e) use the Service in a way that could harm us or other users. We may suspend or terminate accounts that violate these terms.
          </p>

          <h2 className="mt-10 text-xl">4. Subscription and Payments</h2>
          <p>
            Paid plans are billed according to the pricing shown on our website. Payments are processed by Stripe. You may cancel or change your plan as described in the dashboard. Refunds are handled in accordance with our refund policy (see Pricing or contact us).
          </p>

          <h2 className="mt-10 text-xl">5. Intellectual Property</h2>
          <p>
            We own the LocalBot AI platform, branding, and technology. You retain ownership of the content you upload (e.g. Q&A pairs). By using the Service, you grant us a limited license to store, process, and display that content to provide the Service.
          </p>

          <h2 className="mt-10 text-xl">6. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &quot;as is.&quot; We do not guarantee uninterrupted or error-free operation. We are not liable for decisions made or actions taken based on chatbot responses.
          </p>

          <h2 className="mt-10 text-xl">7. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, LocalBot AI and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you paid us in the twelve months preceding the claim.
          </p>

          <h2 className="mt-10 text-xl">8. Changes</h2>
          <p>
            We may update these Terms from time to time. We will post the updated Terms on this page and update the &quot;Last updated&quot; date. Continued use of the Service after changes constitutes acceptance.
          </p>

          <h2 className="mt-10 text-xl">9. Contact</h2>
          <p>
            For questions about these Terms, contact us at{" "}
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
