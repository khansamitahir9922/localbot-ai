"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Bot, Loader2, Eye, EyeOff } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ────────────────────────── VALIDATION SCHEMA ────────────────────────── */

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/* ──────────────────────────── LOGIN CONTENT (uses useSearchParams) ──────────────────────────── */

/**
 * Inner login form. Must be wrapped in Suspense because it uses useSearchParams().
 */
function LoginContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<Provider | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  /** Handle form submission: authenticate via Supabase Auth. */
  async function onSubmit(values: LoginFormValues): Promise<void> {
    setServerError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      // Supabase returns "Invalid login credentials" for wrong email/password.
      // Surface a friendlier message regardless of the exact wording.
      if (
        error.message.toLowerCase().includes("invalid") ||
        error.message.toLowerCase().includes("credentials")
      ) {
        setServerError("Invalid email or password. Please try again.");
      } else if (error.message.toLowerCase().includes("email not confirmed")) {
        setServerError(
          "Please verify your email before logging in. Check your inbox for a confirmation link."
        );
      } else {
        setServerError(error.message);
      }
      return;
    }

    // Honour the ?redirectTo param set by the auth middleware, otherwise
    // fall back to the dashboard.
    const redirectTo = searchParams.get("redirectTo") || "/dashboard";
    router.push(redirectTo);
  }

  /** Handle OAuth sign-in (Google, GitHub, etc.). */
  async function handleOAuthSignIn(provider: Provider): Promise<void> {
    setServerError(null);
    setOauthLoading(provider);

    const supabase = createClient();
    const redirectTo = searchParams.get("redirectTo") || "/dashboard";
    const callbackUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback${redirectTo !== "/dashboard" ? `?next=${encodeURIComponent(redirectTo)}` : ""}`
        : "/auth/callback";

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    });

    if (error) {
      setServerError(error.message);
      setOauthLoading(null);
      return;
    }
    if (data?.url) {
      window.location.href = data.url;
      return;
    }
    setOauthLoading(null);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      {/* Logo / Brand */}
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 transition-opacity hover:opacity-80"
      >
        <Bot className="size-8 text-[#2563EB]" />
        <span className="text-2xl font-bold tracking-tight text-[#1E3A5F]">
          LocalBot AI
        </span>
      </Link>

      {/* Login card */}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[#1E3A5F]">
            Welcome back
          </CardTitle>
          <CardDescription>
            Log in to manage your AI chatbots.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
            noValidate
          >
            {/* ── Server-level error banner ── */}
            {serverError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            {/* ── Email ── */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@business.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* ── Password ── */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#2563EB] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* ── Submit button ── */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full bg-[#2563EB] text-base font-semibold shadow-md shadow-[#2563EB]/20 hover:bg-[#1d4ed8]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* ── Divider ── */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or continue with</span>
              </div>
            </div>

            {/* ── OAuth buttons ── */}
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 border-slate-200"
                disabled={!!oauthLoading}
                onClick={() => handleOAuthSignIn("google")}
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                <span className="ml-2">Google</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 border-slate-200"
                disabled={!!oauthLoading}
                onClick={() => handleOAuthSignIn("github")}
              >
                {oauthLoading === "github" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="ml-2">GitHub</span>
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-[#2563EB] hover:underline"
            >
              Create free account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

/* ──────────────────────────── PAGE (Suspense boundary for useSearchParams) ──────────────────────────── */

/**
 * Login page for LocalBot AI.
 * Wraps content in Suspense so useSearchParams() is allowed during static export.
 */
export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
          <Loader2 className="size-8 animate-spin text-[#2563EB]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
