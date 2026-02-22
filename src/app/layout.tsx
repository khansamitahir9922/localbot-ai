import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LocalBot AI – AI Chatbot Builder for Local Businesses",
  description:
    "Create a custom AI chatbot trained on your business in under 5 minutes. No code needed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster position="top-right" richColors closeButton />
        {/* Chat widget: only ONE script must be on the page. Do not add a second script in Inspect — it breaks loading.
            To show YOUR bot on this site: set NEXT_PUBLIC_WIDGET_TOKEN in Vercel to your bot's embed token, then redeploy. */}
        <Script
          id="lba-widget"
          src="/widget.js?v=8"
          data-token={process.env.NEXT_PUBLIC_WIDGET_TOKEN ?? "4e9b9ef4-8d15-4434-bab1-c667eba4345a"}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
