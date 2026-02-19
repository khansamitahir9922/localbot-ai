"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Bot, Loader2, Eye, EyeOff } from "lucide-react";
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
