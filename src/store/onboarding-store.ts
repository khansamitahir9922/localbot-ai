import { create } from "zustand";

/* ────────────────────────── TYPES ────────────────────────── */

/** Valid step numbers in the onboarding wizard. */
export type OnboardingStep = 1 | 2 | 3 | 4;

/** Metadata for each onboarding step (used by the progress bar). */
export interface StepMeta {
  number: OnboardingStep;
  label: string;
}

/** All four onboarding steps in display order. */
export const ONBOARDING_STEPS: StepMeta[] = [
  { number: 1, label: "Business Info" },
  { number: 2, label: "Train Your Bot" },
  { number: 3, label: "Customize" },
  { number: 4, label: "Deploy" },
];

/** Accumulated data collected across all onboarding steps. */
export interface OnboardingData {
  /** UUID of the workspace created in Step 1. */
  workspaceId?: string;
  /** UUID of the chatbot created in Step 2. */
  chatbotId?: string;
  /** Business name entered in Step 1. */
  businessName?: string;
  /** Business type selected in Step 1. */
  businessType?: string;
  /** Website URL entered in Step 1 (optional). */
  websiteUrl?: string;
  /** Language selected in Step 1. */
  language?: string;
}

/** Shape of the Zustand onboarding store. */
interface OnboardingStore {
  /** The step the user is currently viewing (1-4). */
  currentStep: OnboardingStep;
  /** Navigate to a specific step. */
  setCurrentStep: (step: OnboardingStep) => void;
  /** Accumulated data from all completed steps. */
  onboardingData: OnboardingData;
  /** Merge new key/value pairs into onboardingData. */
  updateOnboardingData: (data: Partial<OnboardingData>) => void;
}

/* ──────────────────────────── STORE ──────────────────────────── */

/**
 * Global Zustand store for the onboarding wizard.
 *
 * Manages the current step and the data collected across steps so that
 * the layout (progress bar) and each step page can stay in sync without
 * prop drilling or React Context.
 *
 * Usage:
 * ```ts
 * const { currentStep, setCurrentStep } = useOnboardingStore();
 * ```
 */
export const useOnboardingStore = create<OnboardingStore>((set) => ({
  currentStep: 1,

  setCurrentStep: (step: OnboardingStep): void => {
    set({ currentStep: step });
  },

  onboardingData: {},

  updateOnboardingData: (data: Partial<OnboardingData>): void => {
    set((state) => ({
      onboardingData: { ...state.onboardingData, ...data },
    }));
  },
}));
