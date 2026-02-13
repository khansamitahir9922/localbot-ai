"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Bot, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
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

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

/* ──────────────────────────── PAGE COMPONENT ──────────────────────────── */

/**
 * Reset-password page for LocalBot AI.
 *
 * Users arrive here after clicking the password-reset link in their email.
 * Supabase automatically logs the user in via the reset flow, so we can
 * call `supabase.auth.updateUser()` directly to set the new password.
 *
 * After a successful update the page shows a success message and
 * redirects to `/login` after a short delay.
 */
export default function ResetPasswordPage(): React.JSX.Element {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  /** Update the user's password via Supabase Auth. */
  async function onSubmit(values: ResetPasswordFormValues): Promise<void> {
    setServerError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("same password")) {
        setServerError(
          "New password must be different from your current password."
        );
      } else {
        setServerError(error.message);
      }
      return;
    }

    // Sign the user out so they log in fresh with the new password.
    await supabase.auth.signOut();

    setIsSuccess(true);

    // Redirect to login after a short delay so the user can read the message.
    setTimeout(() => {
      router.push("/login");
    }, 3000);
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
        {isSuccess ? (
          /* ─────────── SUCCESS STATE ─────────── */
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="size-7 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-[#1E3A5F]">
                Password updated
              </CardTitle>
              <CardDescription className="mt-1 text-base">
                Your password has been updated successfully. Redirecting you
                to the login page…
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Button
                asChild
                className="h-11 w-full bg-[#2563EB] text-base font-semibold shadow-md shadow-[#2563EB]/20 hover:bg-[#1d4ed8]"
              >
                <Link href="/login">Go to login now</Link>
              </Button>
            </CardContent>
          </>
        ) : (
          /* ─────────── FORM STATE ─────────── */
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-[#1E3A5F]">
                Set a new password
              </CardTitle>
              <CardDescription>
                Enter your new password below. Make sure it&apos;s at least 8
                characters.
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

                {/* ── New Password ── */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      aria-invalid={!!errors.password}
                      className="pr-10"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
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

                {/* ── Confirm Password ── */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                      aria-invalid={!!errors.confirmPassword}
                      className="pr-10"
                      {...register("confirmPassword")}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowConfirm((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">
                      {errors.confirmPassword.message}
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
                      Updating password…
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
