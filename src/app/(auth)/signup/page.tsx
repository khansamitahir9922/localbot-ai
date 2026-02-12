"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
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

type SignupFormValues = z.infer<typeof signupSchema>;

/* ──────────────────────────── PAGE COMPONENT ──────────────────────────── */

/**
 * Signup page for LocalBot AI.
 *
 * Renders a centered signup card with email, password, and confirm-password
 * fields. Uses react-hook-form + zod for client-side validation and calls
 * Supabase Auth `signUp()` on submit. Redirects to `/onboarding` on success.
 */
export default function SignupPage(): React.JSX.Element {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  /** Handle form submission: create user via Supabase Auth. */
  async function onSubmit(values: SignupFormValues): Promise<void> {
    setServerError(null);

    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        setServerError(
          "This email is already registered. Try logging in instead."
        );
      } else {
        setServerError(error.message);
      }
      return;
    }

    // When email confirmation is enabled Supabase returns a user with an
    // empty identities array instead of an error for duplicate emails.
    if (
      data.user &&
      data.user.identities &&
      data.user.identities.length === 0
    ) {
      setServerError(
        "This email is already registered. Try logging in instead."
      );
      return;
    }

    router.push("/onboarding");
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

      {/* Signup card */}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[#1E3A5F]">
            Create your account
          </CardTitle>
          <CardDescription>
            Get your AI chatbot live in under 5 minutes — free.
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
              <Label htmlFor="password">Password</Label>
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

            {/* ── Confirm Password ── */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your password"
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
                  Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[#2563EB] hover:underline"
            >
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>

      {/* Legal footnote */}
      <p className="mt-6 max-w-sm text-center text-xs leading-relaxed text-slate-400">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline hover:text-slate-600">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-slate-600">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
