/**
 * Tier limits and feature flags per subscription plan.
 * Used to enforce limits (chatbots, Q&A pairs, conversations) and gate features (API access, branding removal, etc.).
 */

export type PlanId = "free" | "paid" | "premium" | "agency";

export type TierFeatureKey =
  | "brandingRemoval"
  | "pdfReports"
  | "apiAccess"
  | "proactiveChat"
  | "whatsappHandoff"
  | "hubspotIntegration"
  | "whiteLabel";

export interface TierFeatures {
  brandingRemoval: boolean;
  pdfReports: boolean;
  apiAccess: boolean;
  proactiveChat: boolean;
  whatsappHandoff: boolean;
  hubspotIntegration: boolean;
  whiteLabel?: boolean;
}

export interface TierLimitConfig {
  chatbots: number;
  qaPairs: number;
  conversationsPerMonth: number;
  teamMembers: number;
  languages: string[];
  features: TierFeatures;
}

/** Numeric value used to represent "unlimited" in limit checks. */
const UNLIMITED = 999_999;

export const TIER_LIMITS: Record<PlanId, TierLimitConfig> = {
  free: {
    chatbots: 1,
    qaPairs: 20,
    conversationsPerMonth: 100,
    teamMembers: 1,
    languages: ["en"],
    features: {
      brandingRemoval: false,
      pdfReports: false,
      apiAccess: false,
      proactiveChat: false,
      whatsappHandoff: false,
      hubspotIntegration: false,
    },
  },
  paid: {
    chatbots: 3,
    qaPairs: 200,
    conversationsPerMonth: 2000,
    teamMembers: 3,
    languages: ["en", "ar", "es", "fr", "de", "ur"],
    features: {
      brandingRemoval: false,
      pdfReports: true,
      apiAccess: false,
      proactiveChat: true,
      whatsappHandoff: false,
      hubspotIntegration: true,
    },
  },
  premium: {
    chatbots: UNLIMITED,
    qaPairs: UNLIMITED,
    conversationsPerMonth: UNLIMITED,
    teamMembers: UNLIMITED,
    languages: ["en", "ar", "es", "fr", "de", "ur"],
    features: {
      brandingRemoval: true,
      pdfReports: true,
      apiAccess: true,
      proactiveChat: true,
      whatsappHandoff: true,
      hubspotIntegration: true,
    },
  },
  agency: {
    chatbots: UNLIMITED,
    qaPairs: UNLIMITED,
    conversationsPerMonth: UNLIMITED,
    teamMembers: UNLIMITED,
    languages: ["en", "ar", "es", "fr", "de", "ur"],
    features: {
      brandingRemoval: true,
      pdfReports: true,
      apiAccess: true,
      proactiveChat: true,
      whatsappHandoff: true,
      hubspotIntegration: true,
      whiteLabel: true,
    },
  },
};

const VALID_PLANS: PlanId[] = ["free", "paid", "premium", "agency"];

/**
 * Normalize plan string from DB (e.g. subscriptions.plan) to PlanId.
 * Unknown or null/undefined becomes "free".
 */
export function normalizePlan(plan: string | null | undefined): PlanId {
  if (!plan || typeof plan !== "string") return "free";
  const p = plan.toLowerCase().trim();
  return VALID_PLANS.includes(p as PlanId) ? (p as PlanId) : "free";
}

/**
 * Get the limit config for a plan. Always returns a valid config (falls back to free).
 */
export function getTierLimits(plan: string | null | undefined): TierLimitConfig {
  return TIER_LIMITS[normalizePlan(plan)];
}

/**
 * Check if the current count is within the limit for the given plan and limit key.
 * Use for: chatbots, qaPairs, conversationsPerMonth, teamMembers.
 */
export function isWithinLimit(
  plan: string | null | undefined,
  limitKey: keyof Omit<TierLimitConfig, "languages" | "features">,
  currentCount: number
): boolean {
  const limits = getTierLimits(plan);
  const max = limits[limitKey];
  if (typeof max !== "number") return true;
  return currentCount < max;
}

/**
 * Check if the plan allows creating one more of the given resource.
 * Equivalent to isWithinLimit(plan, key, currentCount).
 */
export function canAdd(
  plan: string | null | undefined,
  limitKey: "chatbots" | "qaPairs" | "teamMembers",
  currentCount: number
): boolean {
  return isWithinLimit(plan, limitKey, currentCount);
}

/**
 * Get the maximum allowed count for a limit key (e.g. for display).
 */
export function getLimit(
  plan: string | null | undefined,
  limitKey: keyof Omit<TierLimitConfig, "languages" | "features">
): number {
  return getTierLimits(plan)[limitKey] as number;
}

/**
 * Check if the plan includes a feature flag.
 */
export function hasFeature(
  plan: string | null | undefined,
  feature: TierFeatureKey
): boolean {
  const limits = getTierLimits(plan);
  const value = limits.features[feature];
  return value === true;
}

/**
 * Check if the plan supports the given language code (e.g. "en", "ar").
 */
export function supportsLanguage(
  plan: string | null | undefined,
  languageCode: string
): boolean {
  const limits = getTierLimits(plan);
  return limits.languages.includes(languageCode.toLowerCase());
}
