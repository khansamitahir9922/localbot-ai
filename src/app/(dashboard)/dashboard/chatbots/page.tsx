"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Copy,
  Trash2,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

/* ────────────────────────── TYPES ────────────────────────── */

interface ChatbotRow {
  id: string;
  name: string;
  bot_name: string | null;
  workspace_id: string;
  created_at: string;
  conversationCount: number;
  hasQaPairs: boolean;
  primary_color: string | null;
  welcome_message: string | null;
  fallback_message: string | null;
  widget_position: string | null;
  avatar_style: string | null;
}

/* ────────────────────────── PAGE ────────────────────────── */

export default function ChatbotsPage(): React.JSX.Element {
  const router = useRouter();
  const [chatbots, setChatbots] = useState<ChatbotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatbotToDelete, setChatbotToDelete] = useState<ChatbotRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const loadChatbots = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", user.id);
    const wsIds = (workspaces ?? []).map((w: { id: string }) => w.id);
    if (wsIds.length === 0) {
      setChatbots([]);
      setLoading(false);
      return;
    }

    const { data: bots, error: botsError } = await supabase
      .from("chatbots")
      .select("id, name, bot_name, workspace_id, created_at, primary_color, welcome_message, fallback_message, widget_position, avatar_style")
      .in("workspace_id", wsIds)
      .order("created_at", { ascending: false });

    if (botsError || !bots) {
      toast.error("Failed to load chatbots.");
      setChatbots([]);
      setLoading(false);
      return;
    }

    const botIds = (bots as { id: string }[]).map((b) => b.id);
    if (botIds.length === 0) {
      setChatbots([]);
      setLoading(false);
      return;
    }

    const [convResult, qaResult] = await Promise.all([
      supabase.from("conversations").select("chatbot_id").in("chatbot_id", botIds),
      supabase.from("qa_pairs").select("chatbot_id").in("chatbot_id", botIds),
    ]);

    const convCountByBot: Record<string, number> = {};
    const qaByBot: Record<string, boolean> = {};
    botIds.forEach((id) => {
      convCountByBot[id] = 0;
      qaByBot[id] = false;
    });
    (convResult.data ?? []).forEach((r: { chatbot_id: string }) => {
      convCountByBot[r.chatbot_id] = (convCountByBot[r.chatbot_id] ?? 0) + 1;
    });
    (qaResult.data ?? []).forEach((r: { chatbot_id: string }) => {
      qaByBot[r.chatbot_id] = true;
    });

    const rows: ChatbotRow[] = (bots as ChatbotRow[]).map((b) => ({
      ...b,
      conversationCount: convCountByBot[b.id] ?? 0,
      hasQaPairs: qaByBot[b.id] ?? false,
    }));

    setChatbots(rows);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadChatbots();
  }, [loadChatbots]);

  const handleDuplicate = async (bot: ChatbotRow) => {
    setDuplicatingId(bot.id);
    try {
      const res = await fetch("/api/chatbots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspace_id: bot.workspace_id,
          name: (bot.name || "Chatbot") + " (Copy)",
          bot_name: bot.bot_name ?? "Assistant",
          primary_color: bot.primary_color ?? "#2563EB",
          welcome_message: bot.welcome_message ?? "Hi! How can I help you today?",
          fallback_message:
            bot.fallback_message ??
            "I'm not sure about that. Please contact us for more help.",
          widget_position: bot.widget_position ?? "bottom-right",
          avatar_style: bot.avatar_style ?? "1",
        }),
      });
      const data = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to duplicate.");
        return;
      }
      toast.success("Chatbot duplicated. You can edit it in Settings.");
      loadChatbots();
    } catch {
      toast.error("Failed to duplicate.");
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!chatbotToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/chatbots/${chatbotToDelete.id}`, {
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
      setChatbotToDelete(null);
      loadChatbots();
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-10 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">My Chatbots</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your chatbots, view analytics, and duplicate or delete them.
          </p>
        </div>
        <Button asChild>
          <Link href="/onboarding">
            <Plus className="size-4 mr-2" />
            Create New Chatbot
          </Link>
        </Button>
      </div>

      {chatbots.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <Bot className="size-12 text-slate-300" />
            <div className="text-center">
              <p className="font-medium text-slate-700">No chatbots yet</p>
              <p className="text-sm text-slate-500">
                Create your first chatbot to get started. You can add more later
                based on your plan.
              </p>
            </div>
            <Button asChild>
              <Link href="/onboarding">Create your first chatbot</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Chatbots</CardTitle>
            <CardDescription>
              {chatbots.length} chatbot{chatbots.length !== 1 ? "s" : ""}. Click a
              row to open Analytics for that bot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bot name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Conversations</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chatbots.map((bot) => (
                  <TableRow
                    key={bot.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() =>
                      router.push(`/dashboard/analytics?chatbotId=${encodeURIComponent(bot.id)}`)
                    }
                  >
                    <TableCell>
                      <span className="font-medium text-slate-900">
                        {bot.name || "Unnamed"}
                      </span>
                      {bot.bot_name && bot.bot_name !== (bot.name || "Unnamed") && (
                        <span className="ml-2 text-sm text-slate-500">
                          ({bot.bot_name})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={bot.hasQaPairs ? "default" : "secondary"}
                        className={
                          bot.hasQaPairs
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {bot.hasQaPairs ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {formatDate(bot.created_at)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-700">
                      {bot.conversationCount}
                    </TableCell>
                    <TableCell className="w-[70px]" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Actions"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/settings?chatbotId=${encodeURIComponent(bot.id)}`}
                            >
                              <Pencil className="size-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/analytics?chatbotId=${encodeURIComponent(bot.id)}`}
                            >
                              <BarChart3 className="size-4 mr-2" />
                              View Analytics
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(bot)}
                            disabled={duplicatingId === bot.id}
                          >
                            {duplicatingId === bot.id ? (
                              <Loader2 className="size-4 mr-2 animate-spin" />
                            ) : (
                              <Copy className="size-4 mr-2" />
                            )}
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              setChatbotToDelete(bot);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chatbot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{chatbotToDelete?.name || "this chatbot"}&quot; and
              all its data (conversations, messages, Q&A pairs). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
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
    </div>
  );
}
