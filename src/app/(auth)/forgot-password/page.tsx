"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Bot, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ────────────────────────── VALIDATION SCHEMA ────────────────────────── */

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

/* ──────────────────────────── PAGE COMPONENT ──────────────────────────── */

/**
 * Forgot-password page for LocalBot AI.
 *
 * Renders a centered card with a single email field. On submit it calls
 * Supabase `resetPasswordForEmail()`. Regardless of whether the email
 * exists, a generic success message is shown (security best practice:
 * never reveal if an email is registered).
 */
export default function ForgotPasswordPage(): React.JSX.Element {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  /**
   * Request a password-reset email from Supabase.
   * We always show the success message to avoid leaking whether an
   * email address is registered (Supabase may not return an error for
   * unknown emails depending on project settings).
   */
  async function onSubmit(values: ForgotPasswordFormValues): Promise<void> {
    const supabase = createClient();

    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    // Always show success regardless of the outcome.
    setIsSubmitted(true);
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

      <Card className="w-full max-w-md">
        {isSubmitted ? (
          /* ─────────── SUCCESS STATE ─────────── */
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-green-100">
                <MailCheck className="size-7 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-[#1E3A5F]">
                Check your email
              </CardTitle>
              <CardDescription className="mt-1 text-base">
                Check your email for a password reset link. If you
                don&apos;t see it, check your spam folder.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Button
                asChild
                variant="outline"
                className="h-11 w-full border-slate-300 text-base font-semibold text-[#1E3A5F] hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5"
              >
                <Link href="/login">
                  <ArrowLeft className="size-4" />
                  Back to login
                </Link>
              </Button>
            </CardContent>
          </>
        ) : (
          /* ─────────── FORM STATE ─────────── */
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-[#1E3A5F]">
                Reset your password
              </CardTitle>
              <CardDescription>
                Enter the email address associated with your account and
                we&apos;ll send you a link to reset your password.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-5"
                noValidate
              >
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
                    <p className="text-sm text-red-600">
                      {errors.email.message}
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
                      Sending reset link…
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                {/* ── Back to login ── */}
                <div className="text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB] hover:underline"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to login
                  </Link>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
