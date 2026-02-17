import Link from "next/link";
import { Bot, ArrowLeft, Shield, Database, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy – LocalBot AI",
  description: "Privacy Policy for LocalBot AI. How we collect, use, and protect your data.",
};

export default function PrivacyPage(): React.JSX.Element {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="prose prose-slate mt-10 max-w-none prose-headings:font-semibold prose-headings:text-[#1E3A5F] prose-p:text-slate-600 prose-li:text-slate-600">
          <p className="lead">
            LocalBot AI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
            This policy explains how we collect, use, store, and safeguard your information when you use our
            website and AI chatbot builder service.
          </p>

          <h2 className="mt-10 flex items-center gap-2 text-xl">
            <Database className="size-5 text-[#2563EB]" />
            Information We Collect
          </h2>
          <ul>
            <li><strong>Account data:</strong> Email, name, and password (hashed) when you sign up.</li>
            <li><strong>Chatbot content:</strong> Questions and answers you add to your knowledge base, bot name, welcome messages, and widget settings.</li>
            <li><strong>Conversation data:</strong> Messages exchanged between your website visitors and your chatbot, used to provide the service and improve responses.</li>
            <li><strong>Usage data:</strong> How you use the dashboard (e.g. pages visited, actions taken) to improve the product.</li>
            <li><strong>Technical data:</strong> IP address, browser type, and device information for security and basic analytics.</li>
          </ul>

          <h2 className="mt-10 flex items-center gap-2 text-xl">
            <Lock className="size-5 text-[#2563EB]" />
            How We Use Your Data
          </h2>
          <ul>
            <li>To provide, operate, and maintain the LocalBot AI service.</li>
            <li>To power your chatbot and answer your visitors&apos; questions using your knowledge base.</li>
            <li>To process payments (via Stripe); we do not store your full card details.</li>
            <li>To send you important product updates, security notices, or support replies when necessary.</li>
            <li>To improve our product and fix issues (e.g. aggregated, anonymized analytics).</li>
          </ul>

          <h2 className="mt-10 flex items-center gap-2 text-xl">
            <Shield className="size-5 text-[#2563EB]" />
            Security
          </h2>
          <p>
            We take security seriously and follow practices commonly used by professional SaaS products:
          </p>
          <ul>
            <li><strong>Encryption:</strong> Data in transit is protected with TLS/HTTPS. Sensitive data at rest is stored using industry-standard encryption where applicable.</li>
            <li><strong>Authentication:</strong> Passwords are hashed and never stored in plain text. We use secure session management for logged-in users.</li>
            <li><strong>Access control:</strong> Only authorized systems and personnel can access your data, and only as needed to operate the service and support you.</li>
            <li><strong>Payment security:</strong> Card payments are handled by Stripe. We do not store your full credit card number on our servers.</li>
            <li><strong>Infrastructure:</strong> We use reputable hosting and database providers with strong security and compliance practices.</li>
          </ul>

          <h2 className="mt-10 text-xl">Data Retention &amp; Your Rights</h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide the service and comply with legal obligations. You can request access to, correction of, or deletion of your personal data by contacting us. You may also export your chatbot data from the dashboard.
          </p>

          <h2 className="mt-10 text-xl">Third-Party Services</h2>
          <p>
            We use third-party services for hosting, authentication, payments (Stripe), and AI (e.g. for chatbot responses). These providers have their own privacy and security policies. We only share data necessary for them to perform their services.
          </p>

          <h2 className="mt-10 text-xl">Children&apos;s Privacy</h2>
          <p>
            Our service is not directed at children under 13. We do not knowingly collect personal information from children. If you believe we have collected such data, please contact us so we can remove it.
          </p>

          <h2 className="mt-10 text-xl">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the updated version on this page and update the &quot;Last updated&quot; date. Continued use of the service after changes constitutes acceptance of the revised policy.
          </p>

          <h2 className="mt-10 text-xl">Contact Us</h2>
          <p>
            For privacy-related questions or requests, contact us at{" "}
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
