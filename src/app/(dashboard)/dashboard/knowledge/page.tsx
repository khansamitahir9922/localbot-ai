"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
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
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (!workspaces || workspaces.length === 0) {
      window.location.href = "/onboarding";
      return;
    }

    const workspaceId = workspaces[0].id as string;

    /* Get the first chatbot in the workspace */
    const { data: chatbots } = await supabase
      .from("chatbots")
      .select("id")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (!chatbots || chatbots.length === 0) {
      setCtx({ chatbotId: "", workspaceId });
      setIsLoading(false);
      return;
    }

    const chatbotId = chatbots[0].id as string;
    setCtx({ chatbotId, workspaceId });

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
    } else {
      /* ── Insert new pair ── */
      const { error } = await supabase.from("qa_pairs").insert({
        chatbot_id: ctx.chatbotId,
        question: question.trim(),
        answer: answer.trim(),
      });

      if (error) {
        toast.error(error.message || "Failed to add Q&A pair.");
        setIsSaving(false);
        return;
      }

      toast.success("Q&A pair added!");
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
        <Button
          onClick={handleOpenAdd}
          className="shrink-0 bg-[#2563EB] shadow-md shadow-[#2563EB]/20 hover:bg-[#1d4ed8]"
        >
          <Plus className="size-4" />
          Add New Q&A
        </Button>
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
                Add your first question and answer so your chatbot knows
                how to help your customers.
              </p>
            </div>
            <Button
              onClick={handleOpenAdd}
              className="bg-[#2563EB] shadow-md shadow-[#2563EB]/20 hover:bg-[#1d4ed8]"
            >
              <Plus className="size-4" />
              Add Your First Q&A
            </Button>
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
    </div>
  );
}
