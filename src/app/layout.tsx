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
        {/* Embeddable chat widget – appears on all pages for testing. Replace token with your chatbot's embed_token. */}
        <Script
          id="lba-widget"
          src="/widget.js"
          data-token="722486eb-3554-4b38-932d-9307865444c1"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
