"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getTemplatesForBusinessType } from "@/lib/qa-templates";
import {
  generateAndStoreEmbedding,
  generateEmbeddingsBatch,
} from "@/lib/openai/embeddings";
import { cn } from "@/lib/utils";
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

  /* ── Fetch chatbot + Q&A pairs ── */
  const loadData = useCallback(async (): Promise<void> => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    /* Get the user's first workspace */
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id, business_type")
      .eq("user_id", user.id)
      .limit(1);

    if (!workspaces || workspaces.length === 0) {
      window.location.href = "/onboarding";
      return;
    }

    const workspaceId = workspaces[0].id as string;
    const businessType = (workspaces[0].business_type as string) ?? "other";

    /* Get the first chatbot in the workspace */
    const { data: chatbots } = await supabase
      .from("chatbots")
      .select("id")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (!chatbots || chatbots.length === 0) {
      setCtx({ chatbotId: "", workspaceId, businessType });
      setIsLoading(false);
      return;
    }

    const chatbotId = chatbots[0].id as string;
    setCtx({ chatbotId, workspaceId, businessType });

    /* Fetch all Q&A pairs for this chatbot */
    const { data: qaPairs, error } = await supabase
      .from("qa_pairs")
      .select("id, chatbot_id, question, answer, created_at")
      .eq("chatbot_id", chatbotId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load Q&A pairs.");
    }

    setPairs((qaPairs as QaPair[]) ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

      /* Re-generate embedding in the background (question/answer changed) */
      generateAndStoreEmbedding(
        editingPair.id,
        question.trim(),
        answer.trim()
      ).catch(() => {
        /* non-blocking – already logged inside the helper */
      });
    } else {
      /* ── Insert new pair ── */
      const { data: inserted, error } = await supabase
        .from("qa_pairs")
        .insert({
          chatbot_id: ctx.chatbotId,
          question: question.trim(),
          answer: answer.trim(),
        })
        .select("id")
        .single();

      if (error || !inserted) {
        toast.error(error?.message || "Failed to add Q&A pair.");
        setIsSaving(false);
        return;
      }

      toast.success("Q&A pair added!");

      /* Generate embedding in the background */
      generateAndStoreEmbedding(
        inserted.id as string,
        question.trim(),
        answer.trim()
      ).catch(() => {
        /* non-blocking */
      });
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

  /** Bulk-insert selected templates. */
  async function handleInsertTemplates(): Promise<void> {
    if (!ctx?.chatbotId) return;

    const selected = templatePreviews.filter((t) => t.selected);
    if (selected.length === 0) {
      toast.error("Please select at least one template.");
      return;
    }

    setIsLoadingTemplates(true);
    const supabase = createClient();

    const rows = selected.map((t) => ({
      chatbot_id: ctx.chatbotId,
      question: t.question,
      answer: t.answer,
    }));

    const { data: inserted, error } = await supabase
      .from("qa_pairs")
      .insert(rows)
      .select("id, question, answer");

    if (error || !inserted) {
      toast.error(error?.message || "Failed to add templates.");
      setIsLoadingTemplates(false);
      return;
    }

    toast.success(`Added ${inserted.length} Q&A pairs from templates!`);
    setIsLoadingTemplates(false);
    setTemplateDialogOpen(false);
    await loadData();

    /* Generate embeddings for all inserted templates in the background */
    generateEmbeddingsBatch(
      inserted.map((row) => ({
        id: row.id as string,
        question: row.question as string,
        answer: row.answer as string,
      }))
    ).catch(() => {
      /* non-blocking – already handled inside the helper */
    });
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
        <div>
          <h2 className="text-2xl font-bold text-[#1E3A5F]">
            Knowledge Base
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add questions and answers so your chatbot knows how to respond.
            {pairs.length > 0 && (
              <span className="ml-1 font-medium text-slate-700">
                {pairs.length} item{pairs.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            onClick={handleOpenTemplates}
            className="border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/5"
          >
            <Sparkles className="size-4" />
            Load Templates
          </Button>
          <Button
            onClick={handleOpenAdd}
            className="bg-[#2563EB] shadow-md shadow-[#2563EB]/20 hover:bg-[#1d4ed8]"
          >
            <Plus className="size-4" />
            Add New Q&A
          </Button>
        </div>
      </div>

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
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleOpenTemplates}
                className="border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/5"
              >
                <Sparkles className="size-4" />
                Load Templates
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
