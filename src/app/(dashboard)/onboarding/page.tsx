"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useOnboardingStore } from "@/store/onboarding-store";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ────────────────────────── CONSTANTS ────────────────────────── */

const BUSINESS_TYPES = [
  "Restaurant",
  "Clinic/Medical",
  "Hair Salon",
  "Gym/Fitness",
  "Real Estate",
  "Law Firm",
  "Retail Store",
  "Hotel",
  "Dental Clinic",
  "Beauty Spa",
  "Auto Repair",
  "Other",
] as const;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ur", label: "Urdu" },
] as const;

/* ────────────────────────── VALIDATION ────────────────────────── */

const businessInfoSchema = z.object({
  businessName: z
    .string()
    .min(1, "Business name is required")
    .max(100, "Business name must be 100 characters or fewer"),
  businessType: z.string().min(1, "Please select a business type"),
  websiteUrl: z
    .string()
    .url("Please enter a valid URL (e.g. https://example.com)")
    .or(z.literal("")),
  language: z.string().min(1, "Please select a language"),
});

type BusinessInfoFormValues = z.infer<typeof businessInfoSchema>;

/* ──────────────────────── PAGE COMPONENT ──────────────────────── */

/**
 * Onboarding Step 1 – Business Info.
 *
 * Collects the user's business name, type, website URL, and preferred
 * language. On submit it creates a new row in the `workspaces` table
 * and advances the wizard to Step 2.
 */
export default function OnboardingStep1Page(): React.JSX.Element {
  const [userId, setUserId] = useState<string | null>(null);
  const { setCurrentStep, updateOnboardingData } = useOnboardingStore();

  /* Fetch the authenticated user's ID on mount. */
  useEffect(() => {
    async function fetchUser(): Promise<void> {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    fetchUser();
  }, []);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BusinessInfoFormValues>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      businessName: "",
      businessType: "",
      websiteUrl: "",
      language: "en",
    },
  });

  /** Insert a workspace row and advance to Step 2. */
  async function onSubmit(values: BusinessInfoFormValues): Promise<void> {
    if (!userId) {
      toast.error("Unable to identify your account. Please sign in again.");
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("workspaces")
      .insert({
        user_id: userId,
        name: values.businessName,
        business_type: values.businessType,
        website_url: values.websiteUrl || null,
        language: values.language,
      })
      .select("id")
      .single();

    if (error) {
      toast.error(
        error.message || "Failed to create workspace. Please try again."
      );
      return;
    }

    /* Persist collected data in the Zustand store so later steps can
       reference the workspace ID and business details. */
    updateOnboardingData({
      workspaceId: data.id,
      businessName: values.businessName,
      businessType: values.businessType,
      websiteUrl: values.websiteUrl || undefined,
      language: values.language,
    });

    toast.success("Business info saved!");
    setCurrentStep(2);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-[#1E3A5F]">
          Tell us about your business
        </CardTitle>
        <CardDescription>
          We&apos;ll use this to set up your AI chatbot with the right
          context and pre-filled answers.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
          noValidate
        >
          {/* ── Business Name ── */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              type="text"
              placeholder="e.g. Joe's Coffee Shop"
              autoComplete="organization"
              aria-invalid={!!errors.businessName}
              {...register("businessName")}
            />
            {errors.businessName && (
              <p className="text-sm text-red-600">
                {errors.businessName.message}
              </p>
            )}
          </div>

          {/* ── Business Type ── */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="businessType">Business Type</Label>
            <Controller
              control={control}
              name="businessType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="businessType"
                    className="w-full"
                    aria-invalid={!!errors.businessType}
                  >
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.businessType && (
              <p className="text-sm text-red-600">
                {errors.businessType.message}
              </p>
            )}
          </div>

          {/* ── Website URL ── */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="websiteUrl">
              Website URL{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id="websiteUrl"
              type="url"
              placeholder="https://www.yourbusiness.com"
              autoComplete="url"
              aria-invalid={!!errors.websiteUrl}
              {...register("websiteUrl")}
            />
            {errors.websiteUrl && (
              <p className="text-sm text-red-600">
                {errors.websiteUrl.message}
              </p>
            )}
          </div>

          {/* ── Language ── */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="language">Preferred Language</Label>
            <Controller
              control={control}
              name="language"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="language"
                    className="w-full"
                    aria-invalid={!!errors.language}
                  >
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.language && (
              <p className="text-sm text-red-600">
                {errors.language.message}
              </p>
            )}
          </div>

          {/* ── Submit ── */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !userId}
              className="h-11 min-w-[140px] bg-[#2563EB] text-base font-semibold shadow-md shadow-[#2563EB]/20 hover:bg-[#1d4ed8]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Next →"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
