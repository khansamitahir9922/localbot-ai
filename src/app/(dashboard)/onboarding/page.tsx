"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  Code,
  FileText,
  Globe,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquareText,
  PartyPopper,
  QrCode,
  Rocket,
  Send,
  Share2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  useOnboardingStore,
  type TrainingMethod,
  type WidgetPosition,
  type CustomizationData,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
      return <Step3Customize />;
    case 4:
      return <Step4Deploy />;
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="businessType">Business Type</Label>
            <Controller
              control={control}
              name="businessType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="language">Preferred Language</Label>
            <Controller
              control={control}
              name="language"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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

  function handleSelectMethod(method: TrainingMethod): void {
    setSelectedMethod(method);
    setUrlError(null);
    if (method !== "website") setWebsiteUrl("");
    if (method !== "document") {
      setSelectedFile(null);
      setFileName("");
    }
  }

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

  function handleRemoveFile(): void {
    setSelectedFile(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

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
   STEP 3 – CUSTOMIZE APPEARANCE
   ═══════════════════════════════════════════════════════════════════ */

const DEFAULT_PRIMARY_COLOR = "#2563EB";
const DEFAULT_FALLBACK =
  "I'm not sure about that. Please call us at [phone] for more help.";

/**
 * Onboarding Step 3 – Customize Appearance.
 *
 * Lets the user configure the chatbot's name, colour, welcome message,
 * fallback message, and widget position. A live preview panel on the
 * right (or below on mobile) shows a mockup of the chat widget.
 */
function Step3Customize(): React.JSX.Element {
  const { setCurrentStep, onboardingData, updateOnboardingData } =
    useOnboardingStore();

  const defaultBotName = onboardingData.businessName
    ? `${onboardingData.businessName} Assistant`
    : "My Assistant";

  const saved = onboardingData.customization;

  const [botName, setBotName] = useState(saved?.botName ?? defaultBotName);
  const [primaryColor, setPrimaryColor] = useState(
    saved?.primaryColor ?? DEFAULT_PRIMARY_COLOR
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    saved?.welcomeMessage ??
      `Hi! I'm ${defaultBotName}. How can I help you today?`
  );
  const [fallbackMessage, setFallbackMessage] = useState(
    saved?.fallbackMessage ?? DEFAULT_FALLBACK
  );
  const [widgetPosition, setWidgetPosition] = useState<WidgetPosition>(
    saved?.widgetPosition ?? "bottom-right"
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Sync every field change to the Zustand store for real-time preview. */
  function persistToStore(patch: Partial<CustomizationData>): void {
    const next: CustomizationData = {
      botName,
      primaryColor,
      welcomeMessage,
      fallbackMessage,
      widgetPosition,
      ...patch,
    };
    updateOnboardingData({ customization: next });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!botName.trim()) errs.botName = "Bot name is required.";
    if (!primaryColor.trim()) errs.primaryColor = "Please choose a colour.";
    if (!welcomeMessage.trim())
      errs.welcomeMessage = "Welcome message is required.";
    if (!fallbackMessage.trim())
      errs.fallbackMessage = "Fallback message is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext(): void {
    if (!validate()) return;
    persistToStore({});
    toast.success("Customization saved!");
    setCurrentStep(4);
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* ───────── FORM PANEL ───────── */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[#1E3A5F]">
            Customize your chatbot
          </CardTitle>
          <CardDescription>
            Set your bot&apos;s name, colours, and messages. See the live
            preview on the right.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {/* Bot Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="botName">Bot Name</Label>
            <Input
              id="botName"
              type="text"
              placeholder="e.g. Joe's Assistant"
              value={botName}
              aria-invalid={!!errors.botName}
              onChange={(e) => {
                setBotName(e.target.value);
                setErrors((prev) => ({ ...prev, botName: "" }));
                persistToStore({ botName: e.target.value });
              }}
            />
            {errors.botName && (
              <p className="text-sm text-red-600">{errors.botName}</p>
            )}
          </div>

          {/* Primary Colour */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="primaryColor">Primary Colour</Label>
            <div className="flex items-center gap-3">
              <input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => {
                  setPrimaryColor(e.target.value);
                  persistToStore({ primaryColor: e.target.value });
                }}
                className="size-10 cursor-pointer rounded-md border border-slate-200 p-0.5"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => {
                  setPrimaryColor(e.target.value);
                  persistToStore({ primaryColor: e.target.value });
                }}
                className="w-32 font-mono text-sm"
                maxLength={7}
              />
            </div>
            {errors.primaryColor && (
              <p className="text-sm text-red-600">{errors.primaryColor}</p>
            )}
          </div>

          {/* Welcome Message */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="welcomeMessage">Welcome Message</Label>
            <Textarea
              id="welcomeMessage"
              placeholder="Hi! How can I help you today?"
              value={welcomeMessage}
              rows={3}
              aria-invalid={!!errors.welcomeMessage}
              onChange={(e) => {
                setWelcomeMessage(e.target.value);
                setErrors((prev) => ({ ...prev, welcomeMessage: "" }));
                persistToStore({ welcomeMessage: e.target.value });
              }}
            />
            {errors.welcomeMessage && (
              <p className="text-sm text-red-600">{errors.welcomeMessage}</p>
            )}
          </div>

          {/* Fallback Message */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="fallbackMessage">Fallback Message</Label>
            <Textarea
              id="fallbackMessage"
              placeholder="I'm not sure about that. Please call us for more help."
              value={fallbackMessage}
              rows={3}
              aria-invalid={!!errors.fallbackMessage}
              onChange={(e) => {
                setFallbackMessage(e.target.value);
                setErrors((prev) => ({ ...prev, fallbackMessage: "" }));
                persistToStore({ fallbackMessage: e.target.value });
              }}
            />
            {errors.fallbackMessage && (
              <p className="text-sm text-red-600">
                {errors.fallbackMessage}
              </p>
            )}
          </div>

          {/* Widget Position */}
          <div className="flex flex-col gap-2">
            <Label>Widget Position</Label>
            <div className="flex gap-3">
              {(
                [
                  { value: "bottom-left", label: "Bottom Left" },
                  { value: "bottom-right", label: "Bottom Right" },
                ] as const
              ).map((pos) => (
                <button
                  key={pos.value}
                  type="button"
                  onClick={() => {
                    setWidgetPosition(pos.value);
                    persistToStore({ widgetPosition: pos.value });
                  }}
                  className={cn(
                    "flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all",
                    widgetPosition === pos.value
                      ? "border-[#2563EB] bg-[#2563EB]/5 text-[#2563EB]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="h-11 border-slate-300 text-base font-semibold text-[#1E3A5F]"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              className="h-11 min-w-[140px] bg-[#2563EB] text-base font-semibold shadow-md shadow-[#2563EB]/20 hover:bg-[#1d4ed8]"
            >
              Next →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ───────── LIVE PREVIEW PANEL ───────── */}
      <div className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[340px]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
            Live Preview
          </p>
          <WidgetPreview
            botName={botName || "Assistant"}
            primaryColor={primaryColor || DEFAULT_PRIMARY_COLOR}
            welcomeMessage={
              welcomeMessage || "Hi! How can I help you today?"
            }
            position={widgetPosition}
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   WIDGET PREVIEW – static mockup of the chat widget
   ═══════════════════════════════════════════════════════════════════ */

/**
 * A static visual preview of the chat widget showing the selected
 * colour, bot name, welcome message, and position indicator.
 */
function WidgetPreview({
  botName,
  primaryColor,
  welcomeMessage,
  position,
}: {
  botName: string;
  primaryColor: string;
  welcomeMessage: string;
  position: WidgetPosition;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {/* ── Chat panel mockup ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-lg">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-white/20">
            <MessageCircle className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{botName}</p>
            <p className="text-xs text-white/70">Online</p>
          </div>
          <div className="ml-auto">
            <X className="size-4 text-white/60" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-3 bg-slate-50 px-4 py-4">
          {/* Bot welcome */}
          <div className="flex items-start gap-2">
            <div
              className="flex size-6 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: primaryColor }}
            >
              <MessageCircle className="size-3 text-white" />
            </div>
            <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-sm">
              {welcomeMessage}
            </div>
          </div>

          {/* User sample message */}
          <div className="flex justify-end">
            <div
              className="max-w-[85%] rounded-lg rounded-tr-none px-3 py-2 text-xs leading-relaxed text-white"
              style={{ backgroundColor: primaryColor }}
            >
              What are your opening hours?
            </div>
          </div>

          {/* Bot reply sample */}
          <div className="flex items-start gap-2">
            <div
              className="flex size-6 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: primaryColor }}
            >
              <MessageCircle className="size-3 text-white" />
            </div>
            <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-sm">
              We&apos;re open Monday to Friday, 9 AM – 6 PM. Is there
              anything else I can help with?
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2.5">
          <div className="flex-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-400">
            Type a message…
          </div>
          <div
            className="flex size-7 items-center justify-center rounded-full"
            style={{ backgroundColor: primaryColor }}
          >
            <Send className="size-3 text-white" />
          </div>
        </div>
      </div>

      {/* ── Bubble preview ── */}
      <div
        className={cn(
          "flex items-center gap-3",
          position === "bottom-right" ? "justify-end" : "justify-start"
        )}
      >
        <div
          className="flex size-12 items-center justify-center rounded-full shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          <MessageCircle className="size-5 text-white" />
        </div>
        <span className="text-xs text-slate-400">
          {position === "bottom-right" ? "↘ Bottom Right" : "↙ Bottom Left"}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 4 – DEPLOY & EMBED CODE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Onboarding Step 4 – Deploy & Embed Code.
 *
 * Creates the chatbot row in Supabase (once) using all data gathered in
 * Steps 1-3, then displays the embed `<script>` snippet the user can
 * paste into their website.
 */
function Step4Deploy(): React.JSX.Element {
  const { setCurrentStep, onboardingData, updateOnboardingData } =
    useOnboardingStore();

  const [isCreating, setIsCreating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [embedToken, setEmbedToken] = useState<string | null>(
    onboardingData.embedToken ?? null
  );
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailBodyCopied, setEmailBodyCopied] = useState(false);
  const creationAttempted = useRef(false);

  /* ── Create chatbot row on first mount ── */
  useEffect(() => {
    /* Guard: only run once, and skip if already created. */
    if (creationAttempted.current) return;
    creationAttempted.current = true;

    if (onboardingData.chatbotId && onboardingData.embedToken) {
      setEmbedToken(onboardingData.embedToken);
      setIsCreating(false);
      return;
    }

    async function createChatbot(): Promise<void> {
      try {
        const customization = onboardingData.customization;

        if (!onboardingData.workspaceId) {
          setError("Workspace not found. Please go back to Step 1.");
          setIsCreating(false);
          return;
        }

        const res = await fetch("/api/chatbots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            workspace_id: onboardingData.workspaceId,
            name: customization?.botName || onboardingData.businessName || "My Chatbot",
            bot_name: customization?.botName || "Assistant",
            primary_color: customization?.primaryColor || "#2563EB",
            welcome_message:
              customization?.welcomeMessage ||
              "Hi! How can I help you today?",
            fallback_message:
              customization?.fallbackMessage ||
              "I'm not sure about that. Please contact us for more help.",
            widget_position: customization?.widgetPosition || "bottom-right",
            show_branding: true,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 403 && (data as { code?: string }).code === "LIMIT_CHATBOTS") {
            const d = data as { plan?: string; chatbotsUsed?: number; chatbotsLimit?: number };
            const detail =
              d.plan != null && d.chatbotsUsed != null && d.chatbotsLimit != null
                ? ` You're on the ${d.plan} plan (${d.chatbotsUsed}/${d.chatbotsLimit} chatbots).`
                : "";
            setError(
              `You've reached your chatbot limit for your current plan. Upgrade to add more chatbots.${detail}`
            );
            setLimitReached(true);
          } else {
            setError(
              (data as { error?: string }).error || "Failed to create chatbot. Please try again."
            );
          }
          setIsCreating(false);
          return;
        }

        updateOnboardingData({
          chatbotId: (data as { id: string }).id,
          embedToken: (data as { embed_token?: string }).embed_token,
        });
        setEmbedToken((data as { embed_token?: string }).embed_token);
        setIsCreating(false);
        toast.success("Chatbot created successfully!");
      } catch {
        setError("An unexpected error occurred. Please try again.");
        setIsCreating(false);
      }
    }

    createChatbot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Build the embed snippet using the public token. */
  const embedSnippet = embedToken
    ? `<!-- LocalBot AI Widget -->\n<script\n  src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js"\n  data-chatbot-id="${embedToken}"\n  defer\n></script>`
    : "";

  /** Chat page URL the owner can share directly. */
  const chatPageUrl =
    typeof window !== "undefined" && embedToken
      ? `${window.location.origin}/chat/${embedToken}`
      : "";

  /** Copy the embed code to clipboard. */
  async function handleCopy(): Promise<void> {
    if (!embedSnippet) return;
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopied(true);
      toast.success("Embed code copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy. Please select and copy manually.");
    }
  }

  /* ── Loading state ── */
  if (isCreating) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 className="size-10 animate-spin text-[#2563EB]" />
          <p className="text-base font-medium text-[#1E3A5F]">
            Creating your chatbot…
          </p>
          <p className="text-sm text-slate-500">
            This only takes a moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-red-600">
            Something went wrong
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(3)}
              className="h-11 border-slate-300 text-base font-semibold text-[#1E3A5F]"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {!limitReached && (
              <Button
                type="button"
                onClick={() => {
                  setError(null);
                  setLimitReached(false);
                  setIsCreating(true);
                  creationAttempted.current = false;
                }}
                className="h-11 bg-[#2563EB] text-base font-semibold shadow-md shadow-[#2563EB]/20 hover:bg-[#1d4ed8]"
              >
                Try Again
              </Button>
            )}
            {limitReached && (
              <Button asChild className="h-11 bg-emerald-600 text-base font-semibold hover:bg-emerald-700">
                <Link href="/dashboard/billing">Upgrade plan</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  /** Copy the shareable chat link. */
  async function handleCopyLink(): Promise<void> {
    if (!chatPageUrl) return;
    try {
      await navigator.clipboard.writeText(chatPageUrl);
      setLinkCopied(true);
      toast.success("Chat link copied!");
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      toast.error("Failed to copy link.");
    }
  }

  /** Email subject and body for the developer email. */
  const emailSubject = `Add the ${onboardingData.businessName ?? "LocalBot AI"} chatbot to our website`;
  const emailBody = `Hi,\n\nPlease add our AI chatbot to the website. Here is the embed code — paste it just before the closing </body> tag on every page:\n\n${embedSnippet}\n\nYou can also test it first by visiting:\n${chatPageUrl}\n\nThanks!`;

  /** Open Gmail compose with the embed instructions pre-filled. */
  function handleEmailGmail(): void {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(url, "_blank");
  }

  /** Open Outlook web compose with the embed instructions pre-filled. */
  function handleEmailOutlook(): void {
    const url = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(url, "_blank");
  }

  /** Copy the full email text so the user can paste it anywhere. */
  async function handleCopyEmailBody(): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        `Subject: ${emailSubject}\n\n${emailBody}`
      );
      setEmailBodyCopied(true);
      toast.success("Email content copied! Paste it into any email app.");
      setTimeout(() => setEmailBodyCopied(false), 2500);
    } catch {
      toast.error("Failed to copy. Please try again.");
    }
  }

  /* ── Success state – show embed code ── */
  return (
    <div className="flex flex-col gap-6">
      {/* ────── Success banner ────── */}
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-green-200 bg-green-50 p-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-green-100">
          <PartyPopper className="size-7 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-[#1E3A5F]">
          Your chatbot is ready!
        </h2>
        <p className="max-w-lg text-sm leading-relaxed text-slate-600">
          Choose how you&apos;d like to add it to your website. If
          you&apos;re not technical, just click{" "}
          <strong>&quot;Email to my developer&quot;</strong> — they&apos;ll
          handle the rest.
        </p>
      </div>

      {/* ────── Quick-share options (non-technical) ────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Share2 className="size-5 text-[#2563EB]" />
            <CardTitle className="text-lg font-bold text-[#1E3A5F]">
              Easiest Ways to Share
            </CardTitle>
          </div>
          <CardDescription>
            No coding required — perfect if you just want to get started
            quickly.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Shareable direct link */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Link2 className="size-4 text-[#2563EB]" />
              <h4 className="text-sm font-semibold text-[#1E3A5F]">
                Share a Direct Chat Link
              </h4>
            </div>
            <p className="mb-3 text-sm text-slate-500">
              Share this link with customers on social media, WhatsApp,
              Google Business, or anywhere. They&apos;ll be able to chat
              with your bot instantly — no website changes needed.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                {chatPageUrl || "Generating…"}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {linkCopied ? (
                  <>
                    <Check className="size-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="size-3.5" /> Copy Link
                  </>
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Coming soon: a custom branded page at{" "}
              <span className="font-medium">
                localbot.ai/chat/your-business
              </span>
            </p>
          </div>

          {/* Email to developer */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Mail className="size-4 text-[#2563EB]" />
              <h4 className="text-sm font-semibold text-[#1E3A5F]">
                Email to My Web Developer
              </h4>
            </div>
            <p className="mb-3 text-sm text-slate-500">
              Don&apos;t want to touch code? Pick your email app below
              and we&apos;ll write the email for you — just add your
              developer&apos;s address and hit send.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleEmailGmail}
                className="border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/5"
              >
                <Mail className="size-4" />
                Open in Gmail
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleEmailOutlook}
                className="border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/5"
              >
                <Mail className="size-4" />
                Open in Outlook
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyEmailBody}
                className="border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                {emailBodyCopied ? (
                  <>
                    <Check className="size-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="size-4" />
                    Copy Email Text
                  </>
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              &quot;Copy Email Text&quot; lets you paste the instructions
              into any email app (Yahoo, iCloud, etc.).
            </p>
          </div>

          {/* QR Code placeholder */}
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4">
            <div className="mb-2 flex items-center gap-2">
              <QrCode className="size-4 text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-400">
                QR Code
              </h4>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Download a QR code that links to your chatbot. Print it on
              menus, receipts, table cards, or business cards so customers
              can scan and chat instantly.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ────── Embed code (for technical users) ────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code className="size-5 text-[#2563EB]" />
            <CardTitle className="text-lg font-bold text-[#1E3A5F]">
              Embed on Your Website
            </CardTitle>
          </div>
          <CardDescription>
            For adding the chat widget directly to your website. If this
            looks confusing, use the &quot;Email to Developer&quot; option
            above instead.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Code block */}
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-4 text-sm leading-relaxed text-slate-100">
              <code>{embedSnippet}</code>
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "absolute right-3 top-3 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                copied
                  ? "bg-green-600 text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              {copied ? (
                <>
                  <Check className="size-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <ClipboardCopy className="size-3.5" />
                  Copy Code
                </>
              )}
            </button>
          </div>

          {/* Platform tabs */}
          <Tabs defaultValue="wordpress" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="wordpress">WordPress</TabsTrigger>
              <TabsTrigger value="wix">Wix</TabsTrigger>
              <TabsTrigger value="squarespace">Squarespace</TabsTrigger>
              <TabsTrigger value="html">Other / HTML</TabsTrigger>
            </TabsList>

            {/* ── WordPress (beginner-friendly WPCode method) ── */}
            <TabsContent value="wordpress">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <h4 className="mb-1 text-sm font-semibold text-[#1E3A5F]">
                  WordPress (easiest method — no coding)
                </h4>
                <p className="mb-3 text-xs text-slate-500">
                  We recommend using the free WPCode plugin. It takes
                  about 2 minutes.
                </p>
                <ol className="flex flex-col gap-2 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <StepBadge n={1} />
                    <span>
                      Log in to your WordPress admin panel (usually{" "}
                      <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-xs">
                        yoursite.com/wp-admin
                      </code>
                      ).
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={2} />
                    <span>
                      In the left menu, click{" "}
                      <strong>Plugins → Add New</strong>. Search for{" "}
                      <strong>&quot;WPCode&quot;</strong>. Click{" "}
                      <strong>Install Now</strong>, then{" "}
                      <strong>Activate</strong>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={3} />
                    <span>
                      In the left menu you&apos;ll now see{" "}
                      <strong>Code Snippets</strong>. Click it, then click{" "}
                      <strong>+ Add Snippet → Add Your Custom Code</strong>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={4} />
                    <span>
                      Give it a name like{" "}
                      <strong>&quot;LocalBot AI Chatbot&quot;</strong>.
                      Change the code type to{" "}
                      <strong>HTML Snippet</strong>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={5} />
                    <span>
                      Click the <strong>&quot;Copy Code&quot;</strong>{" "}
                      button above and paste it into the big code box.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={6} />
                    <span>
                      Scroll down to <strong>Insertion</strong> and set
                      the location to{" "}
                      <strong>Site Wide Footer</strong>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={7} />
                    <span>
                      Toggle the snippet to <strong>Active</strong> and
                      click <strong>Save Snippet</strong>. Done! Visit
                      your website and you&apos;ll see the chat bubble.
                    </span>
                  </li>
                </ol>
              </div>
            </TabsContent>

            {/* ── Wix ── */}
            <TabsContent value="wix">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <h4 className="mb-1 text-sm font-semibold text-[#1E3A5F]">
                  Wix
                </h4>
                <p className="mb-3 text-xs text-slate-500">
                  Takes about 2 minutes from your Wix dashboard.
                </p>
                <ol className="flex flex-col gap-2 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <StepBadge n={1} />
                    <span>
                      Log in to your{" "}
                      <strong>Wix Dashboard</strong> (wix.com → My
                      Sites → select your site).
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={2} />
                    <span>
                      Click <strong>Settings</strong> in the left
                      sidebar, then scroll down and click{" "}
                      <strong>Custom Code</strong> (under the Advanced
                      section).
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={3} />
                    <span>
                      Click the <strong>+ Add Custom Code</strong>{" "}
                      button at the top right.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={4} />
                    <span>
                      Click <strong>&quot;Copy Code&quot;</strong> above,
                      then paste it into the code box.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={5} />
                    <span>
                      Give it the name{" "}
                      <strong>&quot;LocalBot AI Chatbot&quot;</strong>.
                      Under &quot;Add Code to Pages&quot;, select{" "}
                      <strong>All Pages</strong>. Under &quot;Place
                      Code in&quot;, select{" "}
                      <strong>Body - end</strong>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={6} />
                    <span>
                      Click <strong>Apply</strong>. Then{" "}
                      <strong>Publish</strong> your site. The chat
                      widget will appear on every page!
                    </span>
                  </li>
                </ol>
              </div>
            </TabsContent>

            {/* ── Squarespace ── */}
            <TabsContent value="squarespace">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <h4 className="mb-1 text-sm font-semibold text-[#1E3A5F]">
                  Squarespace
                </h4>
                <p className="mb-3 text-xs text-slate-500">
                  Requires a Business plan or higher. Takes about 1
                  minute.
                </p>
                <ol className="flex flex-col gap-2 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <StepBadge n={1} />
                    <span>
                      Log in to your Squarespace site and click{" "}
                      <strong>Settings</strong> in the left menu.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={2} />
                    <span>
                      Scroll down to{" "}
                      <strong>Developer Tools</strong> and click{" "}
                      <strong>Code Injection</strong>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={3} />
                    <span>
                      You&apos;ll see a text box labelled{" "}
                      <strong>Footer</strong>. Click{" "}
                      <strong>&quot;Copy Code&quot;</strong> above and
                      paste it into that box.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={4} />
                    <span>
                      Click <strong>Save</strong> at the top. The chat
                      widget now appears on every page of your site!
                    </span>
                  </li>
                </ol>
              </div>
            </TabsContent>

            {/* ── Other / HTML ── */}
            <TabsContent value="html">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <h4 className="mb-1 text-sm font-semibold text-[#1E3A5F]">
                  Any Other Website
                </h4>
                <p className="mb-3 text-xs text-slate-500">
                  Works with Shopify, Webflow, GoDaddy, or any site
                  where you can edit HTML.
                </p>
                <ol className="flex flex-col gap-2 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <StepBadge n={1} />
                    <span>
                      Click <strong>&quot;Copy Code&quot;</strong> above.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={2} />
                    <span>
                      Open the file or editor where your website&apos;s
                      HTML lives. Look for the very bottom of the page.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={3} />
                    <span>
                      Find the line that says{" "}
                      <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-xs">
                        &lt;/body&gt;
                      </code>
                      . Paste the code <strong>right above</strong> that
                      line.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={4} />
                    <span>
                      Save and refresh your website. You&apos;ll see the
                      chat bubble in the corner!
                    </span>
                  </li>
                </ol>
                <p className="mt-3 text-xs text-slate-400">
                  Tip: If your website builder has a &quot;Custom
                  Code&quot; or &quot;Footer Scripts&quot; section, paste
                  it there instead — it&apos;s easier.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Embed token reference */}
          {embedToken && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
              <span className="font-medium text-slate-700">
                Chatbot ID:
              </span>
              <code className="rounded bg-slate-200 px-2 py-0.5 font-mono text-xs text-slate-700">
                {embedToken}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ────── Navigation ────── */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep(3)}
          className="h-11 border-slate-300 text-base font-semibold text-[#1E3A5F]"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          type="button"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
          className="h-11 min-w-[180px] bg-[#2563EB] text-base font-semibold shadow-md shadow-[#2563EB]/20 hover:bg-[#1d4ed8]"
        >
          <Rocket className="size-4" />
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════════════════════════ */

/** Numbered circle badge used inside installation instruction lists. */
function StepBadge({ n }: { n: number }): React.JSX.Element {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-bold text-white">
      {n}
    </span>
  );
}
