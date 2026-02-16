"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Download,
  Loader2,
  Trash2,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CHATBOT_ICONS } from "@/lib/chatbot-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ────────────────────────── DEFAULTS & SCHEMAS ────────────────────────── */

const BOT_DEFAULTS = {
  bot_name: "Assistant",
  primary_color: "#2563EB",
  welcome_message: "Hi! How can I help you today?",
  fallback_message:
    "I'm not sure about that. Please contact us for more help.",
  widget_position: "bottom-right" as const,
  avatar_style: "1" as const,
};

const botSettingsSchema = z.object({
  name: z.string().min(1, "Bot name is required"),
  bot_name: z.string().min(1, "Display name is required"),
  primary_color: z.string().min(1, "Color is required"),
  welcome_message: z.string().min(1, "Welcome message is required"),
  fallback_message: z.string().min(1, "Fallback message is required"),
  widget_position: z.enum(["bottom-left", "bottom-right"]),
  avatar_style: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]),
});

type BotSettingsForm = z.infer<typeof botSettingsSchema>;

interface ChatbotData {
  id: string;
  name: string;
  bot_name: string | null;
  primary_color: string | null;
  welcome_message: string | null;
  fallback_message: string | null;
  widget_position: string | null;
  avatar_style: string | null;
}

/* ────────────────────────── PAGE ────────────────────────── */

export default function SettingsPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const urlChatbotId = searchParams.get("chatbotId");
  const [chatbotId, setChatbotId] = useState<string | null>(null);
  const [chatbot, setChatbot] = useState<ChatbotData | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [savingBot, setSavingBot] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserEmail(user.email ?? null);
    setUserName(
      (user.user_metadata?.full_name as string) ??
        (user.user_metadata?.name as string) ??
        null
    );

    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", user.id);
    const wsIds = (workspaces ?? []).map((w) => w.id as string);
    if (wsIds.length === 0) {
      setLoading(false);
      return;
    }

    let botToSet: ChatbotData | null = null;
    if (urlChatbotId?.trim()) {
      const { data: singleBot } = await supabase
        .from("chatbots")
        .select("id, name, bot_name, primary_color, welcome_message, fallback_message, widget_position, avatar_style")
        .eq("id", urlChatbotId.trim())
        .in("workspace_id", wsIds)
        .single();
      if (singleBot) botToSet = singleBot as ChatbotData;
    }
    if (!botToSet) {
      const { data: chatbots } = await supabase
        .from("chatbots")
        .select("id, name, bot_name, primary_color, welcome_message, fallback_message, widget_position, avatar_style")
        .in("workspace_id", wsIds)
        .order("created_at", { ascending: false })
        .limit(1);
      if (chatbots?.length) botToSet = chatbots[0] as ChatbotData;
    }
    if (botToSet) {
      setChatbotId(botToSet.id);
      setChatbot(botToSet);
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscriptionPlan((sub?.plan as string) ?? "free");
    setLoading(false);
  }, [urlChatbotId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BotSettingsForm>({
    resolver: zodResolver(botSettingsSchema),
    defaultValues: {
      name: "",
      bot_name: BOT_DEFAULTS.bot_name,
      primary_color: BOT_DEFAULTS.primary_color,
      welcome_message: BOT_DEFAULTS.welcome_message,
      fallback_message: BOT_DEFAULTS.fallback_message,
      widget_position: BOT_DEFAULTS.widget_position,
      avatar_style: BOT_DEFAULTS.avatar_style,
    },
  });

  useEffect(() => {
    if (chatbot) {
      reset({
        name: chatbot.name ?? "",
        bot_name: chatbot.bot_name ?? BOT_DEFAULTS.bot_name,
        primary_color: chatbot.primary_color ?? BOT_DEFAULTS.primary_color,
        welcome_message:
          chatbot.welcome_message ?? BOT_DEFAULTS.welcome_message,
        fallback_message:
          chatbot.fallback_message ?? BOT_DEFAULTS.fallback_message,
        widget_position:
          (chatbot.widget_position === "bottom-left" ||
          chatbot.widget_position === "bottom-right"
            ? chatbot.widget_position
            : BOT_DEFAULTS.widget_position) as "bottom-left" | "bottom-right",
        avatar_style: (CHATBOT_ICONS.some((i) => i.id === chatbot.avatar_style)
          ? chatbot.avatar_style
          : BOT_DEFAULTS.avatar_style) as "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10",
      });
    }
  }, [chatbot, reset]);

  const onBotSubmit = async (values: BotSettingsForm) => {
    if (!chatbotId) return;
    setSavingBot(true);
    try {
      const res = await fetch(`/api/chatbots/${chatbotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: values.name,
          bot_name: values.bot_name,
          primary_color: values.primary_color,
          welcome_message: values.welcome_message,
          fallback_message: values.fallback_message,
          widget_position: values.widget_position,
          avatar_style: values.avatar_style,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save.");
        return;
      }
      toast.success("Bot settings saved.");
      setChatbot((prev) =>
        prev
          ? {
              ...prev,
              name: values.name,
              bot_name: values.bot_name,
              primary_color: values.primary_color,
              welcome_message: values.welcome_message,
              fallback_message: values.fallback_message,
              widget_position: values.widget_position,
              avatar_style: values.avatar_style,
            }
          : null
      );
      reset(values);
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSavingBot(false);
    }
  };

  const resetBotToDefaults = () => {
    if (!chatbot) return;
    reset({
      name: chatbot.name ?? "",
      bot_name: BOT_DEFAULTS.bot_name,
      primary_color: BOT_DEFAULTS.primary_color,
      welcome_message: BOT_DEFAULTS.welcome_message,
      fallback_message: BOT_DEFAULTS.fallback_message,
      widget_position: BOT_DEFAULTS.widget_position,
      avatar_style: BOT_DEFAULTS.avatar_style,
    });
    toast.info("Form reset to defaults. Click Save to apply.");
  };

  const onAccountSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nameInput = form.querySelector<HTMLInputElement>('input[name="fullName"]');
    const fullName = nameInput?.value?.trim() ?? "";
    setSavingAccount(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setUserName(fullName);
      toast.success("Account updated.");
    } catch {
      toast.error("Failed to update account.");
    } finally {
      setSavingAccount(false);
    }
  };

  const onChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated. You may need to sign in again.");
      setPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Failed to update password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteChatbot = async () => {
    if (!chatbotId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/chatbots/${chatbotId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete.");
        setDeleting(false);
        return;
      }
      toast.success("Chatbot deleted.");
      setDeleteDialogOpen(false);
      window.location.href = "/dashboard";
    } catch {
      toast.error("Failed to delete.");
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    if (!chatbotId) return;
    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/export`, {
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Export failed.");
        return;
      }
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chatbot-export-${chatbotId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    } catch {
      toast.error("Export failed.");
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Could not open billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Could not open billing portal.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-10 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  if (!chatbotId || !chatbot) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Settings</h1>
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <p className="text-center text-slate-600">
              No chatbot found. Create one in onboarding to manage settings.
            </p>
            <Button asChild>
              <Link href="/onboarding">Go to onboarding</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your chatbot and account.
        </p>
      </div>

      <Tabs defaultValue="bot" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="bot">Bot Settings</TabsTrigger>
          <TabsTrigger value="account">Account Settings</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="bot" className="mt-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Bot Settings</CardTitle>
              <CardDescription>
                Customize your chatbot&apos;s name, colors, and messages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(onBotSubmit)}
                className="flex flex-col gap-6"
              >
                <div className="grid gap-2">
                  <Label htmlFor="name">Bot Name (internal)</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="My Chatbot"
                    className="max-w-md"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bot_name">Display Name (in widget)</Label>
                  <Input
                    id="bot_name"
                    {...register("bot_name")}
                    placeholder="Assistant"
                    className="max-w-md"
                  />
                  {errors.bot_name && (
                    <p className="text-sm text-red-600">
                      {errors.bot_name.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <Controller
                    control={control}
                    name="primary_color"
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="primary_color"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-10 w-14 cursor-pointer rounded border border-slate-200 bg-white p-1"
                        />
                        <Input
                          value={field.value}
                          onChange={field.onChange}
                          className="max-w-[120px] font-mono text-sm"
                        />
                      </div>
                    )}
                  />
                  {errors.primary_color && (
                    <p className="text-sm text-red-600">
                      {errors.primary_color.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="welcome_message">Welcome Message</Label>
                  <Textarea
                    id="welcome_message"
                    {...register("welcome_message")}
                    placeholder="Hi! How can I help you today?"
                    rows={3}
                    className="max-w-xl"
                  />
                  {errors.welcome_message && (
                    <p className="text-sm text-red-600">
                      {errors.welcome_message.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fallback_message">Fallback Message</Label>
                  <Textarea
                    id="fallback_message"
                    {...register("fallback_message")}
                    placeholder="I'm not sure about that. Please contact us."
                    rows={3}
                    className="max-w-xl"
                  />
                  {errors.fallback_message && (
                    <p className="text-sm text-red-600">
                      {errors.fallback_message.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Chatbot Icon</Label>
                  <p className="text-sm text-slate-500">
                    Choose the icon shown on the chat bubble and in the widget.
                  </p>
                  <Controller
                    control={control}
                    name="avatar_style"
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-3">
                        {CHATBOT_ICONS.map((icon) => (
                          <button
                            key={icon.id}
                            type="button"
                            onClick={() => field.onChange(icon.id)}
                            className={
                              "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors " +
                              (field.value === icon.id
                                ? "border-[#2563EB] bg-[#2563EB] text-white"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100")
                            }
                            title={icon.name}
                          >
                            <span
                              className="[&_svg]:size-7"
                              dangerouslySetInnerHTML={{ __html: icon.svg }}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Widget Position</Label>
                  <Controller
                    control={control}
                    name="widget_position"
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="bottom-left" id="pos-left" />
                          <Label htmlFor="pos-left" className="font-normal">
                            Bottom left
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="bottom-right" id="pos-right" />
                          <Label htmlFor="pos-right" className="font-normal">
                            Bottom right
                          </Label>
                        </div>
                      </RadioGroup>
                    )}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={savingBot || !isDirty}>
                    {savingBot ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetBotToDefaults}
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Update your profile and password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={onAccountSubmit} className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={userName ?? ""}
                    placeholder="Your name"
                    className="max-w-md"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    value={userEmail ?? ""}
                    readOnly
                    disabled
                    className="max-w-md bg-slate-50"
                  />
                  <p className="text-xs text-slate-500">
                    Email cannot be changed here.
                  </p>
                </div>
                <Button type="submit" disabled={savingAccount}>
                  {savingAccount ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Save Name"
                  )}
                </Button>
              </form>
              <div>
                <Label className="text-sm font-medium">Password</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setPasswordDialogOpen(true)}
                >
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="mt-6">
          <Card className="border-slate-200 border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="size-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions. Export your data before deleting.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h4 className="font-medium text-slate-800">Export Data</h4>
                <p className="text-sm text-slate-600">
                  Download all chatbot data (Q&A pairs, conversations, messages)
                  as JSON.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExport}
                  className="w-fit"
                >
                  <Download className="size-4 mr-2" />
                  Export Data
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                <h4 className="font-medium text-slate-800">
                  Delete This Chatbot
                </h4>
                <p className="text-sm text-slate-600">
                  Permanently delete this chatbot and all its conversations,
                  messages, and Q&A pairs. This cannot be undone.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-fit"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete This Chatbot
                </Button>
              </div>
              {subscriptionPlan !== "free" && (
                <div className="flex flex-col gap-2">
                  <h4 className="font-medium text-slate-800">
                    Cancel Subscription
                  </h4>
                  <p className="text-sm text-slate-600">
                    Manage or cancel your subscription via Stripe.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-fit"
                    onClick={handleCancelSubscription}
                  >
                    <CreditCard className="size-4 mr-2" />
                    Cancel Subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chatbot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the chatbot and all its data
              (conversations, messages, Q&A pairs). This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteChatbot();
              }}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your new password twice. You may need to sign in again after
              changing it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Same as above"
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={onChangePassword} disabled={changingPassword}>
              {changingPassword ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Update Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
