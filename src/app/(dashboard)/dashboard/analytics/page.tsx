"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MessageCircle,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  HelpCircle,
  Circle,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ────────────────────────── TYPES ────────────────────────── */

interface AnalyticsData {
  chatbotId?: string;
  chatbotName?: string;
  totalConversations: number;
  totalMessages: number;
  answered: number;
  unanswered: number;
  conversationsPerDay: { date: string; count: number }[];
  topQuestions: { question: string; count: number }[];
  recentUnanswered: {
    userMessage: string;
    conversationId: string;
    createdAt: string;
  }[];
}

/* ────────────────────────── PAGE ────────────────────────── */

interface ChatbotOption {
  id: string;
  name: string;
}

function AnalyticsContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const [chatbotsList, setChatbotsList] = useState<ChatbotOption[]>([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusOnline, setStatusOnline] = useState<boolean | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const checkStatus = useCallback(async (chatbotId: string) => {
    setStatusLoading(true);
    setStatusOnline(null);
    try {
      const res = await fetch(`/api/chatbots/${encodeURIComponent(chatbotId)}/status`, {
        credentials: "include",
      });
      const json = (await res.json()) as { online?: boolean };
      setStatusOnline(json.online ?? false);
    } catch {
      setStatusOnline(false);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async (chatbotIdParam?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const url = chatbotIdParam
        ? `/api/analytics?chatbotId=${encodeURIComponent(chatbotIdParam)}`
        : "/api/analytics";
      const res = await fetch(url, { credentials: "include" });
      const json = (await res.json()) as AnalyticsData & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load analytics");
      }
      setData(json);
      if (json.chatbotId) {
        setSelectedChatbotId(json.chatbotId);
        checkStatus(json.chatbotId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [checkStatus]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", user.id);
      const wsIds = (workspaces ?? []).map((w: { id: string }) => w.id);
      if (wsIds.length === 0) {
        setError("No workspace found. Complete onboarding first.");
        setLoading(false);
        return;
      }
      const { data: chatbots } = await supabase
        .from("chatbots")
        .select("id, name")
        .in("workspace_id", wsIds)
        .order("created_at", { ascending: false });
      const list = (chatbots ?? []).map((c: { id: string; name: string | null }) => ({
        id: c.id,
        name: c.name || "Unnamed",
      }));
      setChatbotsList(list);
      if (list.length === 0) {
        setError("No chatbot found. Create one in onboarding.");
        setLoading(false);
        return;
      }
      const urlChatbotId = searchParams.get("chatbotId");
      if (urlChatbotId && list.some((c: ChatbotOption) => c.id === urlChatbotId)) {
        setSelectedChatbotId(urlChatbotId);
        loadAnalytics(urlChatbotId);
        checkStatus(urlChatbotId);
      } else {
        loadAnalytics();
      }
    }
    init();
  }, [loadAnalytics, searchParams, checkStatus]);

  function handleAddToKnowledgeBase(_userMessage: string): void {
    toast.info("Feature coming soon: Add to Knowledge Base");
  }

  const hasData =
    data &&
    (data.totalConversations > 0 ||
      data.topQuestions.length > 0 ||
      data.recentUnanswered.length > 0);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-10 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-center text-slate-600">{error}</p>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setError(null);
              loadAnalytics(selectedChatbotId);
            }}
          >
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data?.chatbotName
              ? `Current month metrics for ${data.chatbotName}. Data updates as conversations happen.`
              : "Current month metrics for your chatbot. Data updates as conversations happen."}
          </p>
        </div>
        {chatbotsList.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">
              Chatbot:
            </span>
            <Select
              value={selectedChatbotId ?? ""}
              onValueChange={(value) => {
                setSelectedChatbotId(value);
                loadAnalytics(value);
                checkStatus(value);
              }}
            >
              <SelectTrigger className="w-[220px] border-slate-200 bg-white">
                <SelectValue placeholder="Select chatbot" />
              </SelectTrigger>
              <SelectContent>
                {chatbotsList.map((cb) => (
                  <SelectItem key={cb.id} value={cb.id}>
                    {cb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedChatbotId && (
              <span className="flex items-center gap-1.5 text-sm">
                {statusLoading ? (
                  <Loader2 className="size-4 animate-spin text-slate-400" />
                ) : statusOnline === true ? (
                  <>
                    <Circle className="size-2 fill-green-500 text-green-500" />
                    <span className="text-green-700">Online</span>
                  </>
                ) : statusOnline === false ? (
                  <>
                    <WifiOff className="size-4 text-amber-600" />
                    <span className="text-amber-700">Offline</span>
                  </>
                ) : null}
              </span>
            )}
          </div>
        )}
      </div>

      {loading && data && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" />
          Refreshing…
        </div>
      )}

      {!hasData && data && !loading && (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <MessageCircle className="size-12 text-slate-300" />
            <div className="text-center">
              <p className="font-medium text-slate-700">No data yet</p>
              <p className="text-sm text-slate-500">
                Start conversations with your chatbot to see analytics here.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {hasData && data && (
        <>
          {/* Metric cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Conversations
                </CardTitle>
                <MessageCircle className="size-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1E3A5F]">
                  {data.totalConversations}
                </div>
                <p className="text-xs text-slate-500">This month</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Messages
                </CardTitle>
                <MessageSquare className="size-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1E3A5F]">
                  {data.totalMessages}
                </div>
                <p className="text-xs text-slate-500">Total sent</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Answered
                </CardTitle>
                <CheckCircle2 className="size-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1E3A5F]">
                  {data.answered}
                </div>
                <p className="text-xs text-slate-500">Questions answered</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Unanswered
                </CardTitle>
                <AlertCircle className="size-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1E3A5F]">
                  {data.unanswered}
                </div>
                <p className="text-xs text-slate-500">Needs attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Conversations per day (last 7 days) */}
          {data.conversationsPerDay.some((d) => d.count > 0) && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#1E3A5F]">
                  Conversations per day
                </CardTitle>
                <CardDescription>Last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.conversationsPerDay.map((d) => ({
                        ...d,
                        label: new Date(d.date + "Z")
                          .toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                          .replace(",", ""),
                      }))}
                      margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    >
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12 }}
                        stroke="#64748b"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                        stroke="#64748b"
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                        }}
                        formatter={(value: number | undefined) => [
                          value ?? 0,
                          "Conversations",
                        ]}
                        labelFormatter={(label) => label}
                      />
                      <Bar
                        dataKey="count"
                        fill="#2563EB"
                        radius={[4, 4, 0, 0]}
                        name="Conversations"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top 10 questions */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[#1E3A5F]">
                <HelpCircle className="size-5" />
                Top questions
              </CardTitle>
              <CardDescription>
                Most frequent user questions this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.topQuestions.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No questions yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60%]">Question</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topQuestions.map((q, i) => (
                      <TableRow key={`${q.question}-${i}`}>
                        <TableCell className="font-medium">
                          {q.question.slice(0, 200)}
                          {q.question.length > 200 ? "…" : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{q.count}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent unanswered */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[#1E3A5F]">
                <AlertCircle className="size-5" />
                Recent unanswered questions
              </CardTitle>
              <CardDescription>
                User questions that received the fallback message. Add them to
                your Knowledge Base to improve answers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentUnanswered.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No unanswered questions this month.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70%]">Question</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[120px] text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentUnanswered.map((u, i) => (
                      <TableRow key={`${u.conversationId}-${u.createdAt}-${i}`}>
                        <TableCell className="font-medium">
                          {u.userMessage.slice(0, 150)}
                          {u.userMessage.length > 150 ? "…" : ""}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {new Date(u.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleAddToKnowledgeBase(u.userMessage)
                            }
                          >
                            <BookOpen className="size-4 mr-1" />
                            Add to Knowledge Base
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {error && hasData && (
        <p className="text-sm text-amber-600">{error}</p>
      )}
    </div>
  );
}

export default function AnalyticsPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-10 animate-spin text-[#2563EB]" />
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
