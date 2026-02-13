"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

/* ────────────────────────────── TYPES ────────────────────────────── */

/** Valid step numbers in the onboarding wizard. */
export type OnboardingStep = 1 | 2 | 3 | 4;

/** Metadata for each onboarding step. */
export interface StepMeta {
  number: OnboardingStep;
  label: string;
}

/** All four onboarding steps in order. */
export const ONBOARDING_STEPS: StepMeta[] = [
  { number: 1, label: "Business Info" },
  { number: 2, label: "Train Your Bot" },
  { number: 3, label: "Customize" },
  { number: 4, label: "Deploy" },
];

/** Shape of the onboarding context value. */
export interface OnboardingContextValue {
  /** The step the user is currently viewing. */
  currentStep: OnboardingStep;
  /** Set of step numbers the user has completed. */
  completedSteps: Set<OnboardingStep>;
  /** Navigate directly to a step. */
  goToStep: (step: OnboardingStep) => void;
  /** Mark a step as completed. */
  completeStep: (step: OnboardingStep) => void;
  /** Mark the current step complete and advance to the next one. */
  nextStep: () => void;
  /** Go back to the previous step. */
  prevStep: () => void;
}

/* ──────────────────────────── CONTEXT ──────────────────────────── */

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/* ──────────────────────────── PROVIDER ──────────────────────────── */

/**
 * Provides step-management state for the onboarding wizard.
 * Wrap this around the onboarding layout so any child page can call
 * `useOnboarding()` to read or update the current step.
 */
export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<OnboardingStep>>(
    new Set()
  );

  const goToStep = useCallback((step: OnboardingStep): void => {
    setCurrentStep(step);
  }, []);

  const completeStep = useCallback((step: OnboardingStep): void => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  const nextStep = useCallback((): void => {
    setCurrentStep((prev) => {
      // Mark the current step as completed before advancing.
      setCompletedSteps((cs) => {
        const next = new Set(cs);
        next.add(prev);
        return next;
      });
      const next = (prev + 1) as OnboardingStep;
      return next <= 4 ? next : prev;
    });
  }, []);

  const prevStep = useCallback((): void => {
    setCurrentStep((prev) => {
      const previous = (prev - 1) as OnboardingStep;
      return previous >= 1 ? previous : prev;
    });
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      currentStep,
      completedSteps,
      goToStep,
      completeStep,
      nextStep,
      prevStep,
    }),
    [currentStep, completedSteps, goToStep, completeStep, nextStep, prevStep]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

/* ──────────────────────────── HOOK ──────────────────────────── */

/**
 * Access the onboarding step state from any child of `OnboardingProvider`.
 * Throws if called outside the provider.
 */
export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within <OnboardingProvider>");
  }
  return context;
}
