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

/** Training method chosen in Step 2. */
export type TrainingMethod = "website" | "manual" | "document";

/** Widget position options. */
export type WidgetPosition = "bottom-left" | "bottom-right";

/** Customization settings collected in Step 3. */
export interface CustomizationData {
  /** Display name shown in the chat widget header. */
  botName: string;
  /** Primary brand colour used for the bubble and header. */
  primaryColor: string;
  /** Message shown when the widget first opens. */
  welcomeMessage: string;
  /** Message shown when the bot can't answer a question. */
  fallbackMessage: string;
  /** Where the chat bubble is positioned on the page. */
  widgetPosition: WidgetPosition;
}

/** Accumulated data collected across all onboarding steps. */
export interface OnboardingData {
  /* ── Step 1 ── */
  workspaceId?: string;
  businessName?: string;
  businessType?: string;
  websiteUrl?: string;
  language?: string;

  /* ── Step 2 ── */
  trainingMethod?: TrainingMethod | null;
  trainingWebsiteUrl?: string;
  documentFileName?: string;

  /* ── Step 3 ── */
  customization?: CustomizationData;

  /* ── Step 4 ── */
  chatbotId?: string;
}

/** Shape of the Zustand onboarding store. */
interface OnboardingStore {
  currentStep: OnboardingStep;
  setCurrentStep: (step: OnboardingStep) => void;
  onboardingData: OnboardingData;
  updateOnboardingData: (data: Partial<OnboardingData>) => void;
}

/* ──────────────────────────── STORE ──────────────────────────── */

/**
 * Global Zustand store for the onboarding wizard.
 *
 * Manages the current step and the data collected across steps so that
 * the layout (progress bar) and each step page can stay in sync without
 * prop drilling or React Context.
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
