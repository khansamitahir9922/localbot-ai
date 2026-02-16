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
        {/* Chat widget on this app: one bot is shown (by data-token). This is for testing only.
            The token below is fixed – e.g. "tahir dopatta Assistant". The Analytics dropdown shows
            which bot's data you're viewing; the bubble here stays this one bot unless you change the token. */}
        <Script
          id="lba-widget"
          src="/widget.js?v=8"
          data-token="4e9b9ef4-8d15-4434-bab1-c667eba4345a"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
