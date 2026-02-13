"use client";

import Link from "next/link";
import { Bot, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOnboardingStore,
  ONBOARDING_STEPS,
  type OnboardingStep,
} from "@/store/onboarding-store";

/* ═══════════════════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Onboarding layout wrapper.
 *
 * Reads the current step from the Zustand onboarding store and renders
 * a 4-step progress indicator at the top of the screen. Children
 * (the active step's page content) are rendered below.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* ── Top bar ── */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Bot className="size-7 text-[#2563EB]" />
            <span className="text-xl font-bold tracking-tight text-[#1E3A5F]">
              LocalBot AI
            </span>
          </Link>
          <span className="text-sm text-slate-500">Setup Wizard</span>
        </div>
      </header>

      {/* ── Step progress bar ── */}
      <div className="border-b border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <StepProgressBar />
        </div>
      </div>

      {/* ── Page content (active step) ── */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP PROGRESS BAR
   ═══════════════════════════════════════════════════════════════════ */

/**
 * A horizontal 4-step progress indicator.
 *
 * - Completed steps (number < currentStep) show a blue circle with a
 *   white checkmark.
 * - The active step shows a blue circle with the step number.
 * - Future steps show a grey circle with the step number.
 * - Connecting lines between circles turn blue once the preceding step
 *   is completed.
 */
function StepProgressBar(): React.JSX.Element {
  const currentStep = useOnboardingStore((s) => s.currentStep);

  return (
    <div className="flex items-center justify-between">
      {ONBOARDING_STEPS.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isActive = step.number === currentStep;
        const isLast = index === ONBOARDING_STEPS.length - 1;

        return (
          <div key={step.number} className="flex flex-1 items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-2">
              <StepCircle
                step={step.number}
                isActive={isActive}
                isCompleted={isCompleted}
              />
              <span
                className={cn(
                  "text-center text-xs font-medium sm:text-sm",
                  (isActive || isCompleted) && "text-[#2563EB]",
                  !isActive && !isCompleted && "text-slate-400"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connecting line (skip after the last step) */}
            {!isLast && (
              <div
                className={cn(
                  "mx-2 mb-6 h-0.5 flex-1 rounded-full sm:mx-3",
                  isCompleted ? "bg-[#2563EB]" : "bg-slate-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP CIRCLE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * A single numbered circle in the progress bar.
 * Shows a checkmark when completed, the step number otherwise.
 */
function StepCircle({
  step,
  isActive,
  isCompleted,
}: {
  step: OnboardingStep;
  isActive: boolean;
  isCompleted: boolean;
}): React.JSX.Element {
  if (isCompleted) {
    return (
      <div className="flex size-9 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/25 sm:size-10">
        <Check className="size-4 sm:size-5" strokeWidth={3} />
      </div>
    );
  }

  if (isActive) {
    return (
      <div className="flex size-9 items-center justify-center rounded-full bg-[#2563EB] text-sm font-bold text-white shadow-md shadow-[#2563EB]/25 sm:size-10 sm:text-base">
        {step}
      </div>
    );
  }

  return (
    <div className="flex size-9 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-sm font-bold text-slate-400 sm:size-10 sm:text-base">
      {step}
    </div>
  );
}
