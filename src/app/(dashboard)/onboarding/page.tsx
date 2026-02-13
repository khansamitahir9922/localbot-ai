"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import {
  ArrowLeft,
  FileText,
  Globe,
  Loader2,
  MessageSquareText,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  useOnboardingStore,
  type TrainingMethod,
} from "@/store/onboarding-store";
import { cn } from "@/lib/utils";
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

/* ═══════════════════════════════════════════════════════════════════
   ROUTER – renders the correct step based on Zustand store
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Onboarding page.
 *
 * Acts as a router: reads `currentStep` from the Zustand store and
 * renders the matching step component. All steps share the same URL
 * (`/onboarding`) — navigation is state-driven, not URL-driven.
 */
export default function OnboardingPage(): React.JSX.Element {
  const currentStep = useOnboardingStore((s) => s.currentStep);

  switch (currentStep) {
    case 1:
      return <Step1BusinessInfo />;
    case 2:
      return <Step2TrainYourBot />;
    case 3:
      return (
        <PlaceholderStep
          title="Customize Your Bot"
          description="This step is coming next."
          step={3}
        />
      );
    case 4:
      return (
        <PlaceholderStep
          title="Deploy"
          description="This step is coming next."
          step={4}
        />
      );
    default:
      return <Step1BusinessInfo />;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 1 – BUSINESS INFO
   ═══════════════════════════════════════════════════════════════════ */

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

/**
 * Onboarding Step 1 – Business Info.
 *
 * Collects the user's business name, type, website URL, and preferred
 * language. On submit it creates a new row in the `workspaces` table
 * and advances the wizard to Step 2.
 */
function Step1BusinessInfo(): React.JSX.Element {
  const [userId, setUserId] = useState<string | null>(null);
  const { setCurrentStep, updateOnboardingData } = useOnboardingStore();

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

/* ═══════════════════════════════════════════════════════════════════
   STEP 2 – TRAIN YOUR BOT
   ═══════════════════════════════════════════════════════════════════ */

const MAX_FILE_SIZE_MB = 10;
const ACCEPTED_FILE_TYPES = ".pdf,.docx";

/** Training method option metadata. */
const TRAINING_OPTIONS: {
  method: TrainingMethod;
  icon: React.ReactNode;
  title: string;
  description: string;
}[] = [
  {
    method: "website",
    icon: <Globe className="size-6 text-[#2563EB]" />,
    title: "Paste Your Website URL",
    description:
      "We'll crawl your website and extract FAQs, services, and business info automatically.",
  },
  {
    method: "manual",
    icon: <MessageSquareText className="size-6 text-[#2563EB]" />,
    title: "Answer Questions Manually",
    description:
      "We'll generate questions based on your business type. You answer them, and the bot learns.",
  },
  {
    method: "document",
    icon: <FileText className="size-6 text-[#2563EB]" />,
    title: "Upload a Document",
    description:
      "Upload a PDF or DOCX with your FAQs, menu, services list, or any business info.",
  },
];

/**
 * Onboarding Step 2 – Train Your Bot.
 *
 * Lets the user choose how they want to train their chatbot:
 * 1. Website URL (crawl)
 * 2. Manual Q&A
 * 3. Document upload
 *
 * Selection and supporting inputs are stored in the Zustand onboarding
 * store. On "Next", the wizard advances to Step 3.
 */
function Step2TrainYourBot(): React.JSX.Element {
  const { setCurrentStep, onboardingData, updateOnboardingData } =
    useOnboardingStore();

  const [selectedMethod, setSelectedMethod] = useState<TrainingMethod | null>(
    onboardingData.trainingMethod ?? null
  );
  const [websiteUrl, setWebsiteUrl] = useState(
    onboardingData.trainingWebsiteUrl ?? ""
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState(
    onboardingData.documentFileName ?? ""
  );
  const [urlError, setUrlError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Select a training method and clear irrelevant inputs. */
  function handleSelectMethod(method: TrainingMethod): void {
    setSelectedMethod(method);
    setUrlError(null);

    if (method !== "website") {
      setWebsiteUrl("");
    }
    if (method !== "document") {
      setSelectedFile(null);
      setFileName("");
    }
  }

  /** Handle file selection with size + type validation. */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File must be smaller than ${MAX_FILE_SIZE_MB}MB.`);
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
  }

  /** Remove the selected file. */
  function handleRemoveFile(): void {
    setSelectedFile(null);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  /** Validate and advance to Step 3. */
  function handleNext(): void {
    if (!selectedMethod) {
      toast.error("Please select a training method.");
      return;
    }

    if (selectedMethod === "website") {
      if (!websiteUrl.trim()) {
        setUrlError("Please enter your website URL.");
        return;
      }
      try {
        new URL(websiteUrl);
        setUrlError(null);
      } catch {
        setUrlError("Please enter a valid URL (e.g. https://example.com).");
        return;
      }
    }

    /* Persist selections in the Zustand store. */
    updateOnboardingData({
      trainingMethod: selectedMethod,
      trainingWebsiteUrl:
        selectedMethod === "website" ? websiteUrl : undefined,
      documentFileName:
        selectedMethod === "document" ? fileName : undefined,
    });

    toast.success("Training method saved!");
    setCurrentStep(3);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-[#1E3A5F]">
          How would you like to train your chatbot?
        </CardTitle>
        <CardDescription>
          Choose a method below. You can always add more data later from
          your dashboard.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* ── Method cards ── */}
        <div className="flex flex-col gap-4">
          {TRAINING_OPTIONS.map((option) => {
            const isSelected = selectedMethod === option.method;

            return (
              <button
                key={option.method}
                type="button"
                onClick={() => handleSelectMethod(option.method)}
                className={cn(
                  "flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all sm:p-5",
                  isSelected
                    ? "border-[#2563EB] bg-[#2563EB]/5 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg",
                    isSelected ? "bg-[#2563EB]/10" : "bg-slate-100"
                  )}
                >
                  {option.icon}
                </div>
                <div className="flex flex-col gap-1">
                  <span
                    className={cn(
                      "text-base font-semibold",
                      isSelected ? "text-[#2563EB]" : "text-[#1E3A5F]"
                    )}
                  >
                    {option.title}
                  </span>
                  <span className="text-sm leading-relaxed text-slate-500">
                    {option.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Conditional inputs based on selected method ── */}

        {/* Website URL input */}
        {selectedMethod === "website" && (
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4">
            <Label htmlFor="trainingUrl">Website URL</Label>
            <Input
              id="trainingUrl"
              type="url"
              placeholder="https://www.yourbusiness.com"
              value={websiteUrl}
              onChange={(e) => {
                setWebsiteUrl(e.target.value);
                setUrlError(null);
              }}
              aria-invalid={!!urlError}
            />
            {urlError && (
              <p className="text-sm text-red-600">{urlError}</p>
            )}
            <p className="text-xs text-slate-400">
              We&apos;ll crawl your site to extract FAQs and business info.
            </p>
          </div>
        )}

        {/* Document upload input */}
        {selectedMethod === "document" && (
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <Label>Upload Document</Label>

            {fileName ? (
              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-[#2563EB]" />
                  <span className="text-sm font-medium text-[#1E3A5F]">
                    {fileName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                  aria-label="Remove file"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition-colors hover:border-[#2563EB]/40 hover:bg-[#2563EB]/5"
              >
                <Upload className="size-8 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">
                  Click to upload a file
                </span>
                <span className="text-xs text-slate-400">
                  PDF or DOCX, max {MAX_FILE_SIZE_MB}MB
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {/* ── Navigation buttons ── */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep(1)}
            className="h-11 border-slate-300 text-base font-semibold text-[#1E3A5F]"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={!selectedMethod}
            className="h-11 min-w-[140px] bg-[#2563EB] text-base font-semibold shadow-md shadow-[#2563EB]/20 hover:bg-[#1d4ed8]"
          >
            Next →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PLACEHOLDER STEP (for Steps 3 & 4 – built later)
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Temporary placeholder card for steps that haven't been built yet.
 * Shows a title, description, and back/next buttons.
 */
function PlaceholderStep({
  title,
  description,
  step,
}: {
  title: string;
  description: string;
  step: 3 | 4;
}): React.JSX.Element {
  const { setCurrentStep } = useOnboardingStore();

  const previousStep = (step - 1) as 1 | 2 | 3;
  const nextStep = step < 4 ? ((step + 1) as 2 | 3 | 4) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-[#1E3A5F]">
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep(previousStep)}
            className="h-11 border-slate-300 text-base font-semibold text-[#1E3A5F]"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {nextStep && (
            <Button
              type="button"
              onClick={() => setCurrentStep(nextStep)}
              className="h-11 min-w-[140px] bg-[#2563EB] text-base font-semibold shadow-md shadow-[#2563EB]/20 hover:bg-[#1d4ed8]"
            >
              Next →
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
