"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Dashboard page.
 *
 * On load, checks whether the authenticated user has completed onboarding
 * (i.e. has at least one workspace). If not, redirects to `/onboarding`.
 * Otherwise displays a placeholder dashboard with a sign-out button.
 */
export default function DashboardPage(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    async function checkOnboarding(): Promise<void> {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      /* Query the workspaces table.
         Any failure (table missing, RLS block, empty result) means the
         user has not completed onboarding → hard-redirect there. */
      const { data, error } = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      const hasWorkspace =
        !error && Array.isArray(data) && data.length > 0;

      if (!hasWorkspace) {
        /* Hard redirect – guaranteed to navigate even if Next.js
           client-side routing has issues. */
        window.location.href = "/onboarding";
        return;
      }

      /* User has a workspace → show the dashboard. */
      setEmail(user.email ?? null);
      setIsReady(true);
    }

    checkOnboarding();
  }, []);

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  /* Show a loading spinner while checking onboarding status or
     while the hard redirect is in progress. */
  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Bot className="size-7 text-[#2563EB]" />
            <span className="text-xl font-bold tracking-tight text-[#1E3A5F]">
              LocalBot AI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-600 sm:block">
              {email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="border-slate-300 text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              {isSigningOut ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Sign Out
            </Button>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-[#1E3A5F]">
              Welcome to your dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-slate-600">
              You&apos;re signed in as{" "}
              <span className="font-medium text-[#1E3A5F]">{email}</span>.
            </p>
            <p className="text-sm text-slate-500">
              The full dashboard with chatbot management, analytics, and
              settings is coming next. For now you can sign out to test the
              auth pages.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
