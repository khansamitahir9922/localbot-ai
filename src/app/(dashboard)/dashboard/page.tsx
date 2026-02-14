"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  BookOpen,
  Loader2,
  MessageSquare,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/* ────────────────────────── TYPES ────────────────────────── */

interface ChatbotRow {
  id: string;
  name: string;
  bot_name: string | null;
  primary_color: string | null;
  created_at: string;
}

type ChatbotStatus = "active" | "training" | "inactive";

interface DashboardData {
  businessName: string;
  chatbots: ChatbotRow[];
  /** Total Q&A / knowledge items across all chatbots. */
  knowledgeCount: number;
}

/* ────────────────────────── HELPERS ────────────────────────── */

/** Derive a display status for a chatbot (placeholder logic). */
function getChatbotStatus(bot: ChatbotRow, knowledgeCount: number): ChatbotStatus {
  // For now: if there are knowledge items → active, else training
  if (knowledgeCount > 0) return "active";
  return "training";
}

const STATUS_CONFIG: Record<
  ChatbotStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  training: {
    label: "Training",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  inactive: {
    label: "Inactive",
    className: "border-slate-200 bg-slate-50 text-slate-500",
  },
};

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Dashboard overview page.
 *
 * Checks onboarding status on mount and redirects to `/onboarding`
 * if the user has no workspace. Fetches chatbots and knowledge count,
 * then displays metric cards, chatbot list, and a quick-setup prompt
 * when training data is missing.
 */
export default function DashboardPage(): React.JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard(): Promise<void> {
      const supabase = createClient();

      /* ── Auth check ── */
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      /* ── Workspace check ── */
      const { data: workspaces, error: wsError } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("user_id", user.id)
        .limit(1);

      const hasWorkspace =
        !wsError && Array.isArray(workspaces) && workspaces.length > 0;

      if (!hasWorkspace) {
        window.location.href = "/onboarding";
        return;
      }

      const workspace = workspaces[0];

      /* ── Fetch chatbots ── */
      const { data: chatbots } = await supabase
        .from("chatbots")
        .select("id, name, bot_name, primary_color, created_at")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false });

      /* ── Fetch knowledge item count (Q&A pairs) ── */
      const { count: knowledgeCount } = await supabase
        .from("knowledge_items")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id);

      setData({
        businessName: workspace.name ?? "",
        chatbots: (chatbots as ChatbotRow[]) ?? [],
        knowledgeCount: knowledgeCount ?? 0,
      });
      setIsLoading(false);
    }

    loadDashboard();
  }, []);

  /* ── Loading state ── */
  if (isLoading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  const activeBots = data.chatbots.filter(
    (b) => getChatbotStatus(b, data.knowledgeCount) === "active"
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* ──── Welcome header ──── */}
      <div>
        <h2 className="text-2xl font-bold text-[#1E3A5F]">
          Welcome back
          {data.businessName ? `, ${data.businessName}` : ""}!
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s an overview of your chatbot performance.
        </p>
      </div>

      {/* ──── Metric cards ──── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={<MessagesSquare className="size-5 text-[#2563EB]" />}
          title="Conversations"
          value="0"
          subtitle="This month"
        />
        <MetricCard
          icon={<MessageSquare className="size-5 text-green-600" />}
          title="Answered"
          value="0"
          subtitle="Questions answered"
        />
        <MetricCard
          icon={<AlertCircle className="size-5 text-amber-500" />}
          title="Unanswered"
          value="0"
          subtitle="Needs attention"
        />
        <MetricCard
          icon={<Bot className="size-5 text-purple-600" />}
          title="Active Chatbots"
          value={String(activeBots)}
          subtitle={`${data.chatbots.length} total`}
        />
      </div>

      {/* ──── Quick Setup prompt (shown when no knowledge items) ──── */}
      {data.knowledgeCount === 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <Sparkles className="size-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#1E3A5F]">
                Your chatbot needs training data
              </h3>
              <p className="mt-0.5 text-sm text-slate-600">
                Add FAQs, upload documents, or connect your website so
                your chatbot can answer customer questions accurately.
              </p>
            </div>
            <Button asChild className="shrink-0 bg-[#2563EB] hover:bg-[#1d4ed8]">
              <Link href="/dashboard/knowledge">
                <BookOpen className="size-4" />
                Go to Knowledge Base
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ──── Chatbot list ──── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-[#1E3A5F]">
              Your Chatbots
            </CardTitle>
            <CardDescription>
              {data.chatbots.length === 0
                ? "No chatbots yet. Complete onboarding to create your first one."
                : `${data.chatbots.length} chatbot${data.chatbots.length > 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          {data.chatbots.length > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/chatbots">
                View All
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </CardHeader>

        {data.chatbots.length > 0 && (
          <CardContent>
            <div className="flex flex-col divide-y divide-slate-100">
              {data.chatbots.map((bot) => {
                const status = getChatbotStatus(bot, data.knowledgeCount);
                const config = STATUS_CONFIG[status];

                return (
                  <div
                    key={bot.id}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    {/* Color dot */}
                    <div
                      className="size-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor: bot.primary_color ?? "#2563EB",
                      }}
                    />

                    {/* Name + bot_name */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-[#1E3A5F]">
                        {bot.name}
                      </p>
                      {bot.bot_name && bot.bot_name !== bot.name && (
                        <p className="truncate text-xs text-slate-400">
                          Widget name: {bot.bot_name}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 text-xs", config.className)}
                    >
                      {config.label}
                    </Badge>

                    {/* Created date */}
                    <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
                      {new Date(bot.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ──── Getting Started checklist ──── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#1E3A5F]">
            Getting Started
          </CardTitle>
          <CardDescription>
            Complete these steps to get the most out of your chatbot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <ChecklistItem done label="Create your workspace" />
            <ChecklistItem
              done={data.chatbots.length > 0}
              label="Set up your chatbot"
            />
            <ChecklistItem
              done={data.knowledgeCount > 0}
              label="Train your chatbot with your business data"
            />
            <ChecklistItem
              done={false}
              label="Embed the widget on your website"
            />
            <ChecklistItem
              done={false}
              label="Get your first customer conversation"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

/** Stat/metric card shown in the overview grid. */
function MetricCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100">
            {icon}
          </div>
        </div>
        <div>
          <p className="text-3xl font-bold text-[#1E3A5F]">{value}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Single item in the Getting Started checklist. */
function ChecklistItem({
  done,
  label,
}: {
  done: boolean;
  label: string;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          done
            ? "bg-green-100 text-green-600"
            : "border-2 border-slate-200 text-slate-400"
        )}
      >
        {done ? "✓" : ""}
      </div>
      <span
        className={cn(
          "text-sm",
          done
            ? "text-slate-500 line-through"
            : "font-medium text-[#1E3A5F]"
        )}
      >
        {label}
      </span>
    </div>
  );
}
