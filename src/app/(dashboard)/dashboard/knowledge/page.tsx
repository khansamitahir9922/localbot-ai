"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  Globe,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getTemplatesForBusinessType } from "@/lib/qa-templates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

/* ────────────────────────── TYPES ────────────────────────── */

interface QaPair {
  id: string;
  chatbot_id: string;
  question: string;
  answer: string;
  created_at: string;
}

interface PageContext {
  chatbotId: string;
  workspaceId: string;
  businessType: string;
}

/* ────────────────────────── EMBEDDING HELPER ────────────────────────── */

/**
 * Silently generate an embedding for a Q&A pair, store it in Supabase,
 * and upsert the vector to Pinecone for semantic search.
 *
 * - POSTs to /api/embeddings to get the vector.
 * - Updates the `embedding` column on the matching qa_pairs row.
 * - POSTs to /api/pinecone/upsert to sync the vector for search.
 * - Never shows toasts — only logs errors to the console.
 * - Designed to be fire-and-forget; never throws.
 */
async function generateEmbedding(
  qaPairId: string,
  chatbotId: string,
  questionText: string,
  answerText: string
): Promise<void> {
  try {
    /* ── 1. Generate embedding via OpenAI ── */
    const res = await fetch("/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: questionText }),
    });

    if (!res.ok) {
      console.error(
        `[embeddings] API returned ${res.status} for pair ${qaPairId}`
      );
      return;
    }

    const data = (await res.json()) as { embedding?: number[] };

    if (!data.embedding) {
      console.error(`[embeddings] No embedding returned for pair ${qaPairId}`);
      return;
    }

    /* ── 2. Store embedding in Supabase ── */
    const supabase = createClient();
    const { error } = await supabase
      .from("qa_pairs")
      .update({ embedding: data.embedding })
      .eq("id", qaPairId);

    if (error) {
      console.error(
        `[embeddings] Supabase update failed for pair ${qaPairId}:`,
        error.message
      );
    }

    /* ── 3. Upsert vector to Pinecone ── */
    try {
      await fetch("/api/pinecone/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: qaPairId,
          vector: data.embedding,
          metadata: {
            chatbot_id: chatbotId,
            question: questionText,
            answer: answerText,
          },
        }),
      });
    } catch (pineconeErr) {
      console.error(
        `[pinecone] Upsert failed for pair ${qaPairId}:`,
        pineconeErr
      );
    }
  } catch (err) {
    console.error(`[embeddings] Unexpected error for pair ${qaPairId}:`, err);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   KNOWLEDGE BASE PAGE
   ═══════════════════════════════════════════════════════════════════ */

export default function KnowledgeBasePage(): React.JSX.Element {
  /* ── Core state ── */
  const [ctx, setCtx] = useState<PageContext | null>(null);
  const [pairs, setPairs] = useState<QaPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  /* ── Dialog state (add / edit) ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<QaPair | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /* ── Delete confirmation state ── */
  const [deleteTarget, setDeleteTarget] = useState<QaPair | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ── Template dialog state ── */
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templatePreviews, setTemplatePreviews] = useState<
    { question: string; answer: string; selected: boolean }[]
  >([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  /* ── Crawl / Import from URL dialog state ── */
  const [crawlDialogOpen, setCrawlDialogOpen] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResults, setCrawlResults] = useState<
    { question: string; answer: string; selected: boolean }[]
  >([]);
  const [crawlPagesScraped, setCrawlPagesScraped] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  /* ── Pinecone sync state ── */
  const [isSyncing, setIsSyncing] = useState(false);

  /* ── Usage/limits for current user (from /api/limits/usage) ── */
  const [usage, setUsage] = useState<{
    plan: string;
    qaPairsUsed: number;
    qaPairsLimit: number;
  } | null>(null);

  /* ── All chatbots in workspace (for selector) ── */
  const [chatbotsList, setChatbotsList] = useState<
    { id: string; bot_name: string }[]
  >([]);

  /* ── Fetch Q&A pairs for a specific chatbot ── */
  const loadPairsForChatbot = useCallback(
    async (chatbotId: string): Promise<void> => {
      const supabase = createClient();
      const { data: qaPairs, error } = await supabase
        .from("qa_pairs")
        .select("id, chatbot_id, question, answer, created_at")
        .eq("chatbot_id", chatbotId)
        .order("created_at", { ascending: false });

      if (error) toast.error("Failed to load Q&A pairs.");
      setPairs((qaPairs as QaPair[]) ?? []);
    },
    []
  );

  /* ── Fetch workspace, all chatbots, and Q&A for first (or selected) chatbot ── */
  const loadData = useCallback(async (): Promise<void> => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    /* Fetch ALL workspaces (same as Dashboard) with one retry to avoid redirect-to-onboarding race */
    let workspaces: { id: string; business_type: string }[] | null = null;
    let wsError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await supabase
        .from("workspaces")
        .select("id, business_type")
        .eq("user_id", user.id);
      workspaces = result.data;
      wsError = result.error;
      if (!result.error && Array.isArray(result.data) && result.data.length > 0)
        break;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
    }

    if (wsError || !workspaces || workspaces.length === 0) {
      if (!wsError && workspaces && workspaces.length === 0) {
        window.location.href = "/onboarding";
      }
      if (wsError) {
        setIsLoading(false);
        toast.error("Failed to load workspace. Please refresh.");
      }
      return;
    }

    /* Use ALL workspaces (same as Dashboard / My Chatbots) so Knowledge Base shows all your chatbots */
    const workspaceIds = workspaces.map((w) => w.id);
    const businessType = (workspaces[0].business_type as string) ?? "other";

    /* Get all chatbots across all workspaces, newest first */
    const { data: chatbots } = await supabase
      .from("chatbots")
      .select("id, bot_name, workspace_id")
      .in("workspace_id", workspaceIds)
      .order("created_at", { ascending: false });

    if (!chatbots || chatbots.length === 0) {
      setCtx({ chatbotId: "", workspaceId: workspaceIds[0] ?? "", businessType });
      setChatbotsList([]);
      setIsLoading(false);
      return;
    }

    const list = chatbots as { id: string; bot_name: string; workspace_id: string }[];
    setChatbotsList(list.map((c) => ({ id: c.id, bot_name: c.bot_name })));
    const firstChatbot = list[0];
    setCtx({
      chatbotId: firstChatbot.id,
      workspaceId: firstChatbot.workspace_id,
      businessType,
    });

    const { data: qaPairs, error } = await supabase
      .from("qa_pairs")
      .select("id, chatbot_id, question, answer, created_at")
      .eq("chatbot_id", firstChatbot.id)
      .order("created_at", { ascending: false });

    if (error) toast.error("Failed to load Q&A pairs.");
    setPairs((qaPairs as QaPair[]) ?? []);
    setIsLoading(false);
  }, []);

  /* ── Switch chatbot and reload its Q&A pairs ── */
  function handleChatbotChange(newChatbotId: string): void {
    if (!ctx) return;
    setCtx({ ...ctx, chatbotId: newChatbotId });
    loadPairsForChatbot(newChatbotId);
  }

  useEffect(() => {
    loadData();
  }, [loadData]);

  function refetchUsage(): void {
    if (!ctx?.chatbotId) return;
    fetch(`/api/limits/usage?chatbotId=${encodeURIComponent(ctx.chatbotId)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.qaPairsUsed != null && data.qaPairsLimit != null) {
          setUsage({
            plan: data.plan ?? "free",
            qaPairsUsed: data.qaPairsUsed,
            qaPairsLimit: data.qaPairsLimit,
          });
        }
      })
      .catch(() => {});
  }

  /* ── Fetch usage/limits when chatbot is selected ── */
  useEffect(() => {
    if (!ctx?.chatbotId) {
      setUsage(null);
      return;
    }
    refetchUsage();
  }, [ctx?.chatbotId]);

  /* ── Filtered pairs ── */
  const filteredPairs = searchQuery.trim()
    ? pairs.filter(
        (p) =>
          p.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : pairs;

  /* ── Open dialog for Add ── */
  function handleOpenAdd(): void {
    setEditingPair(null);
    setQuestion("");
    setAnswer("");
    setDialogOpen(true);
  }

  /* ── Open dialog for Edit ── */
  function handleOpenEdit(pair: QaPair): void {
    setEditingPair(pair);
    setQuestion(pair.question);
    setAnswer(pair.answer);
    setDialogOpen(true);
  }

  /* ── Save (add or update) ── */
  async function handleSave(): Promise<void> {
    if (!question.trim()) {
      toast.error("Question is required.");
      return;
    }
    if (!answer.trim()) {
      toast.error("Answer is required.");
      return;
    }
    if (!ctx?.chatbotId) {
      toast.error("No chatbot found. Please create one first.");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    if (editingPair) {
      /* ── Update existing pair ── */
      const { error } = await supabase
        .from("qa_pairs")
        .update({
          question: question.trim(),
          answer: answer.trim(),
        })
        .eq("id", editingPair.id);

      if (error) {
        toast.error(error.message || "Failed to update Q&A pair.");
        setIsSaving(false);
        return;
      }

      toast.success("Q&A pair updated!");

      /* Re-generate embedding silently in the background */
      generateEmbedding(editingPair.id, ctx.chatbotId, question.trim(), answer.trim());
    } else {
      /* ── Insert new pair via API (enforces plan limit) ── */
      const res = await fetch("/api/qa-pairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          chatbotId: ctx.chatbotId,
          question: question.trim(),
          answer: answer.trim(),
        }),
      });
      const data = (await res.json()) as { ids?: string[]; error?: string; code?: string };

      if (!res.ok) {
        if (res.status === 403 && data.code === "LIMIT_QA_PAIRS") {
          toast.error("Q&A limit reached. Upgrade your plan to add more.", {
            action: { label: "Upgrade", onClick: () => window.open("/dashboard/billing") },
          });
        } else {
          toast.error(data.error || "Failed to add Q&A pair.");
        }
        setIsSaving(false);
        return;
      }

      const newId = data.ids?.[0];
      toast.success("Q&A pair added!");
      if (newId) {
        generateEmbedding(newId, ctx.chatbotId, question.trim(), answer.trim());
      }
      refetchUsage();
    }

    setIsSaving(false);
    setDialogOpen(false);
    setEditingPair(null);
    setQuestion("");
    setAnswer("");
    await loadData();
  }

  /* ── Delete ── */
  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;

    setIsDeleting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("qa_pairs")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      toast.error(error.message || "Failed to delete Q&A pair.");
      setIsDeleting(false);
      return;
    }

    toast.success("Q&A pair deleted.");
    setIsDeleting(false);
    setDeleteTarget(null);
    await loadData();
  }

  /* ── Open template dialog ── */
  function handleOpenTemplates(): void {
    if (!ctx) return;
    const templates = getTemplatesForBusinessType(ctx.businessType);

    /* Mark templates that already exist in the list as de-selected */
    const existingQuestions = new Set(
      pairs.map((p) => p.question.toLowerCase().trim())
    );

    setTemplatePreviews(
      templates.map((t) => ({
        question: t.question,
        answer: t.answer,
        selected: !existingQuestions.has(t.question.toLowerCase().trim()),
      }))
    );
    setTemplateDialogOpen(true);
  }

  /** Toggle a single template's selection. */
  function toggleTemplate(index: number): void {
    setTemplatePreviews((prev) =>
      prev.map((t, i) =>
        i === index ? { ...t, selected: !t.selected } : t
      )
    );
  }

  /** Bulk-insert selected templates via API (enforces plan limit). */
  async function handleInsertTemplates(): Promise<void> {
    if (!ctx?.chatbotId) return;

    const selected = templatePreviews.filter((t) => t.selected);
    if (selected.length === 0) {
      toast.error("Please select at least one template.");
      return;
    }

    setIsLoadingTemplates(true);

    const res = await fetch("/api/qa-pairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        chatbotId: ctx.chatbotId,
        pairs: selected.map((t) => ({ question: t.question, answer: t.answer })),
      }),
    });
    const data = (await res.json()) as {
      inserted?: number;
      ids?: string[];
      error?: string;
      code?: string;
    };

    if (!res.ok) {
      if (res.status === 403 && data.code === "LIMIT_QA_PAIRS") {
        toast.error("Q&A limit reached. Upgrade your plan to add more.", {
          action: { label: "Upgrade", onClick: () => window.open("/dashboard/billing") },
        });
      } else {
        toast.error(data.error || "Failed to add templates.");
      }
      setIsLoadingTemplates(false);
      return;
    }

    const ids = data.ids ?? [];
    toast.success(`Added ${ids.length} Q&A pairs from templates!`);
    setIsLoadingTemplates(false);
    setTemplateDialogOpen(false);
    await loadData();
    refetchUsage();

    Promise.allSettled(
      selected.slice(0, ids.length).map((t, i) =>
        generateEmbedding(ids[i]!, ctx.chatbotId!, t.question, t.answer)
      )
    );
  }

  /** Sync all Q&A pairs (with embeddings) to Pinecone. */
  async function handleSyncToPinecone(): Promise<void> {
    if (!ctx?.chatbotId) return;

    setIsSyncing(true);

    try {
      const res = await fetch("/api/pinecone/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId: ctx.chatbotId }),
      });

      const data = (await res.json()) as {
        synced?: number;
        failed?: number;
        total?: number;
        error?: string;
      };

      if (!res.ok) {
        toast.error(data.error || "Sync failed.");
        setIsSyncing(false);
        return;
      }

      if ((data.total ?? 0) === 0) {
        toast.info(
          "No Q&A pairs with embeddings to sync. Add some Q&As first."
        );
      } else if ((data.failed ?? 0) === 0) {
        toast.success(
          `Synced ${data.synced} Q&A pair${data.synced !== 1 ? "s" : ""} to Pinecone!`
        );
      } else {
        toast.warning(
          `Synced ${data.synced} of ${data.total}. ${data.failed} failed — try again later.`
        );
      }
    } catch {
      toast.error("Network error during sync. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  }

  /* ── Open crawl dialog ── */
  function handleOpenCrawl(): void {
    setCrawlUrl("");
    setCrawlResults([]);
    setCrawlPagesScraped(0);
    setIsCrawling(false);
    setIsImporting(false);
    setCrawlDialogOpen(true);
  }

  /** Trigger the crawl API and populate results. */
  async function handleCrawl(): Promise<void> {
    if (!crawlUrl.trim()) {
      toast.error("Please enter a website URL.");
      return;
    }
    if (!ctx?.chatbotId) {
      toast.error("No chatbot found.");
      return;
    }

    setIsCrawling(true);
    setCrawlResults([]);
    setCrawlPagesScraped(0);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: crawlUrl.trim(), chatbotId: ctx.chatbotId }),
      });

      const data = (await res.json()) as {
        pairs?: { question: string; answer: string }[];
        pagesScraped?: number;
        error?: string;
      };

      if (!res.ok || !data.pairs) {
        toast.error(data.error || "Failed to crawl website.");
        setIsCrawling(false);
        return;
      }

      setCrawlPagesScraped(data.pagesScraped ?? 0);
      setCrawlResults(
        data.pairs.map((p) => ({
          question: p.question,
          answer: p.answer,
          selected: true,
        }))
      );
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsCrawling(false);
    }
  }

  /** Toggle a single crawl result's selection. */
  function toggleCrawlResult(index: number): void {
    setCrawlResults((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, selected: !r.selected } : r
      )
    );
  }

  /** Insert selected crawl results via API (enforces plan limit). */
  async function handleImportCrawlResults(): Promise<void> {
    if (!ctx?.chatbotId) return;

    const selected = crawlResults.filter((r) => r.selected);
    if (selected.length === 0) {
      toast.error("Please select at least one Q&A pair.");
      return;
    }

    setIsImporting(true);

    const res = await fetch("/api/qa-pairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        chatbotId: ctx.chatbotId,
        pairs: selected.map((r) => ({ question: r.question, answer: r.answer })),
      }),
    });
    const data = (await res.json()) as {
      inserted?: number;
      ids?: string[];
      error?: string;
      code?: string;
    };

    if (!res.ok) {
      if (res.status === 403 && data.code === "LIMIT_QA_PAIRS") {
        toast.error("Q&A limit reached. Upgrade your plan to add more.", {
          action: { label: "Upgrade", onClick: () => window.open("/dashboard/billing") },
        });
      } else {
        toast.error(data.error || "Failed to import Q&A pairs.");
      }
      setIsImporting(false);
      return;
    }

    const ids = data.ids ?? [];
    toast.success(
      `Imported ${ids.length} Q&A pair${ids.length !== 1 ? "s" : ""} from website!`
    );
    setIsImporting(false);
    setCrawlDialogOpen(false);
    await loadData();
    refetchUsage();

    Promise.allSettled(
      selected.slice(0, ids.length).map((r, i) =>
        generateEmbedding(ids[i]!, ctx.chatbotId!, r.question, r.answer)
      )
    );
  }

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  /* ── No chatbot state ── */
  if (!ctx?.chatbotId) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CardContent className="flex flex-col items-center gap-4 pt-10 pb-10">
          <BookOpen className="size-12 text-slate-300" />
          <h2 className="text-lg font-bold text-[#1E3A5F]">
            No chatbot found
          </h2>
          <p className="text-sm text-slate-500">
            You need to create a chatbot during onboarding before you can
            add knowledge items.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ──── Header ──── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-[#1E3A5F]">
              Knowledge Base
            </h2>
            {chatbotsList.length > 1 && (
              <Select
                value={ctx.chatbotId}
                onValueChange={handleChatbotChange}
              >
                <SelectTrigger className="w-[220px] border-slate-200 bg-white">
                  <SelectValue placeholder="Select chatbot" />
                </SelectTrigger>
                <SelectContent>
                  {chatbotsList.map((cb) => (
                    <SelectItem key={cb.id} value={cb.id}>
                      {cb.bot_name ?? "Unnamed"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Add questions and answers so your chatbot knows how to respond.
            {pairs.length > 0 && (
              <span className="ml-1 font-medium text-slate-700">
                {pairs.length} item{pairs.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
          {usage && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  {usage.qaPairsUsed} / {usage.qaPairsLimit} Q&A pairs used
                </span>
              </div>
              <Progress
                value={
                  usage.qaPairsLimit > 0
                    ? Math.min(100, (usage.qaPairsUsed / usage.qaPairsLimit) * 100)
                    : 0
                }
                className="h-1.5 w-48"
              />
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleOpenTemplates}
            className="border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/5"
          >
            <Sparkles className="size-4" />
            Load Templates
          </Button>
          <Button
            variant="outline"
            onClick={handleOpenCrawl}
            className="border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/5"
          >
            <Globe className="size-4" />
            Import from URL
          </Button>
          {pairs.length > 0 && (
            <Button
              variant="outline"
              onClick={handleSyncToPinecone}
              disabled={isSyncing}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Syncing…
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Sync to Pinecone
                </>
              )}
            </Button>
          )}
          <Button
            onClick={handleOpenAdd}
            className="bg-[#2563EB] shadow-md shadow-[#2563EB]/20 hover:bg-[#1d4ed8]"
          >
            <Plus className="size-4" />
            Add New Q&A
          </Button>
</div>
        </div>

      {/* ──── Approaching limit warning ──── */}
      {usage &&
        usage.qaPairsLimit > 0 &&
        usage.qaPairsUsed >= usage.qaPairsLimit * 0.8 &&
        usage.qaPairsUsed < usage.qaPairsLimit && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-amber-800">
                You&apos;re approaching your Q&A limit ({usage.qaPairsUsed}/{usage.qaPairsLimit}).
                Upgrade to add more.
              </p>
              <Button asChild size="sm" className="shrink-0 bg-amber-600 hover:bg-amber-700">
                <Link href="/dashboard/billing">Upgrade plan</Link>
              </Button>
            </CardContent>
          </Card>
        )}

      {/* ──── At limit ──── */}
      {usage &&
        usage.qaPairsLimit > 0 &&
        usage.qaPairsUsed >= usage.qaPairsLimit && (
          <Card className="border-rose-200 bg-rose-50/50">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-rose-800">
                You&apos;ve reached your Q&A limit. Upgrade to add more pairs.
              </p>
              <Button asChild size="sm" className="shrink-0 bg-rose-600 hover:bg-rose-700">
                <Link href="/dashboard/billing">Upgrade plan</Link>
              </Button>
            </CardContent>
          </Card>
        )}

      {/* ──── Search (show when there are items) ──── */}
      {pairs.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search questions or answers…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* ──── Empty state ──── */}
      {pairs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-slate-100">
              <BookOpen className="size-6 text-slate-400" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1E3A5F]">
                No Q&A pairs yet
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Add your first question and answer, or load pre-written
                templates based on your business type to get started
                quickly.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={handleOpenTemplates}
                className="border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/5"
              >
                <Sparkles className="size-4" />
                Load Templates
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenCrawl}
                className="border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/5"
              >
                <Globe className="size-4" />
                Import from URL
              </Button>
              <Button
                onClick={handleOpenAdd}
                className="bg-[#2563EB] shadow-md shadow-[#2563EB]/20 hover:bg-[#1d4ed8]"
              >
                <Plus className="size-4" />
                Add Q&A Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ──── Table ──── */}
      {pairs.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Question</TableHead>
                  <TableHead className="w-[45%]">Answer</TableHead>
                  <TableHead className="w-[15%] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPairs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-8 text-center text-sm text-slate-400"
                    >
                      No results for &quot;{searchQuery}&quot;
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPairs.map((pair) => (
                    <TableRow key={pair.id}>
                      <TableCell className="align-top font-medium text-[#1E3A5F]">
                        <p className="line-clamp-3 whitespace-pre-wrap text-sm">
                          {pair.question}
                        </p>
                      </TableCell>
                      <TableCell className="align-top">
                        <p className="line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">
                          {pair.answer}
                        </p>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(pair)}
                            className="size-8 text-slate-500 hover:text-[#2563EB]"
                            aria-label="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(pair)}
                            className="size-8 text-slate-500 hover:text-red-600"
                            aria-label="Delete"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ──── Add / Edit Dialog ──── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1E3A5F]">
              {editingPair ? "Edit Q&A Pair" : "Add New Q&A Pair"}
            </DialogTitle>
            <DialogDescription>
              {editingPair
                ? "Update the question and answer below."
                : "Enter a question your customers might ask and the answer your chatbot should give."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="qa-question">Question</Label>
              <Textarea
                id="qa-question"
                placeholder="e.g. What are your opening hours?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="qa-answer">Answer</Label>
              <Textarea
                id="qa-answer"
                placeholder="e.g. We're open Monday to Friday, 9 AM – 6 PM."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !question.trim() || !answer.trim()}
              className="bg-[#2563EB] hover:bg-[#1d4ed8]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : editingPair ? (
                "Update"
              ) : (
                "Add Q&A"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Delete Confirmation ──── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Q&A pair?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the question and answer. Your
              chatbot will no longer use this information to respond.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteTarget && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-[#1E3A5F]">
                {deleteTarget.question}
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ──── Import from URL Dialog ──── */}
      <Dialog
        open={crawlDialogOpen}
        onOpenChange={(open) => {
          if (!isCrawling && !isImporting) setCrawlDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[85vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1E3A5F]">
              <Globe className="size-5 text-[#2563EB]" />
              Import Q&A from Website
            </DialogTitle>
            <DialogDescription>
              Enter your website URL. We&apos;ll read the pages and use AI to
              create Q&A pairs automatically.
            </DialogDescription>
          </DialogHeader>

          {/* URL input + Crawl button */}
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://your-website.com"
              value={crawlUrl}
              onChange={(e) => setCrawlUrl(e.target.value)}
              disabled={isCrawling}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCrawling) handleCrawl();
              }}
            />
            <Button
              onClick={handleCrawl}
              disabled={isCrawling || !crawlUrl.trim()}
              className="shrink-0 bg-[#2563EB] hover:bg-[#1d4ed8]"
            >
              {isCrawling ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Crawling…
                </>
              ) : (
                "Crawl"
              )}
            </Button>
          </div>

          {/* Crawling state */}
          {isCrawling && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="size-8 animate-spin text-[#2563EB]" />
              <div>
                <p className="font-medium text-[#1E3A5F]">
                  Crawling website…
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  This may take 1–2 minutes for larger sites. We&apos;re
                  reading your website and generating Q&A pairs with AI.
                </p>
              </div>
            </div>
          )}

          {/* Results */}
          {!isCrawling && crawlResults.length > 0 && (
            <>
              {/* Summary + Select/Deselect all */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <p className="text-sm text-slate-500">
                  Found{" "}
                  <strong className="text-slate-700">
                    {crawlResults.length}
                  </strong>{" "}
                  Q&A pairs from{" "}
                  <strong className="text-slate-700">
                    {crawlPagesScraped}
                  </strong>{" "}
                  page{crawlPagesScraped !== 1 ? "s" : ""} —{" "}
                  {crawlResults.filter((r) => r.selected).length} selected
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = crawlResults.every(
                      (r) => r.selected
                    );
                    setCrawlResults((prev) =>
                      prev.map((r) => ({ ...r, selected: !allSelected }))
                    );
                  }}
                  className="text-sm font-medium text-[#2563EB] hover:underline"
                >
                  {crawlResults.every((r) => r.selected)
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              {/* Scrollable list */}
              <div className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto pr-1">
                {crawlResults.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleCrawlResult(index)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                      result.selected
                        ? "border-[#2563EB] bg-[#2563EB]/5"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                        result.selected
                          ? "border-[#2563EB] bg-[#2563EB] text-white"
                          : "border-slate-300"
                      )}
                    >
                      {result.selected && <Check className="size-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1E3A5F]">
                        {result.question}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                        {result.answer}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Import button */}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCrawlDialogOpen(false)}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportCrawlResults}
                  disabled={
                    isImporting ||
                    crawlResults.filter((r) => r.selected).length === 0
                  }
                  className="bg-[#2563EB] hover:bg-[#1d4ed8]"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Import{" "}
                      {crawlResults.filter((r) => r.selected).length} Q&A
                      Pairs
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ──── Template Picker Dialog ──── */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-h-[85vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1E3A5F]">
              <Sparkles className="size-5 text-[#2563EB]" />
              Load Q&A Templates
            </DialogTitle>
            <DialogDescription>
              Pre-written questions and answers for your{" "}
              <strong className="text-slate-700">
                {ctx?.businessType ?? "business"}
              </strong>{" "}
              business. Select the ones you want to add, then edit them
              later to match your actual details.
            </DialogDescription>
          </DialogHeader>

          {/* Select/deselect all */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <p className="text-sm text-slate-500">
              {templatePreviews.filter((t) => t.selected).length} of{" "}
              {templatePreviews.length} selected
            </p>
            <button
              type="button"
              onClick={() => {
                const allSelected = templatePreviews.every(
                  (t) => t.selected
                );
                setTemplatePreviews((prev) =>
                  prev.map((t) => ({ ...t, selected: !allSelected }))
                );
              }}
              className="text-sm font-medium text-[#2563EB] hover:underline"
            >
              {templatePreviews.every((t) => t.selected)
                ? "Deselect All"
                : "Select All"}
            </button>
          </div>

          {/* Template list */}
          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
            {templatePreviews.map((tmpl, index) => (
              <button
                key={index}
                type="button"
                onClick={() => toggleTemplate(index)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                  tmpl.selected
                    ? "border-[#2563EB] bg-[#2563EB]/5"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    tmpl.selected
                      ? "border-[#2563EB] bg-[#2563EB] text-white"
                      : "border-slate-300"
                  )}
                >
                  {tmpl.selected && <Check className="size-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1E3A5F]">
                    {tmpl.question}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {tmpl.answer}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTemplateDialogOpen(false)}
              disabled={isLoadingTemplates}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInsertTemplates}
              disabled={
                isLoadingTemplates ||
                templatePreviews.filter((t) => t.selected).length === 0
              }
              className="bg-[#2563EB] hover:bg-[#1d4ed8]"
            >
              {isLoadingTemplates ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Add {templatePreviews.filter((t) => t.selected).length}{" "}
                  Q&A Pairs
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
