"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Check,
  ClipboardCopy,
  Code,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

/* ────────────────────────── TYPES ────────────────────────── */

interface ChatbotOption {
  id: string;
  bot_name: string | null;
  embed_token: string | null;
}

function StepBadge({ n }: { n: number }): React.JSX.Element {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-bold text-white">
      {n}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EMBED PAGE
   ═══════════════════════════════════════════════════════════════════ */

export default function EmbedPage(): React.JSX.Element {
  const [chatbots, setChatbots] = useState<ChatbotOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const widgetBaseUrl =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_URL) ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const selected = chatbots.find((c) => c.id === selectedId);
  const embedToken = selected?.embed_token ?? null;
  const embedSnippet =
    embedToken && widgetBaseUrl
      ? `<!-- LocalBot AI Widget -->\n<script\n  src="${widgetBaseUrl}/widget.js"\n  data-token="${embedToken}"\n  defer\n></script>`
      : "";

  const loadChatbots = useCallback(async (): Promise<void> => {
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

    if (!workspaces || workspaces.length === 0) {
      window.location.href = "/onboarding";
      return;
    }

    const workspaceIds = workspaces.map((w: { id: string }) => w.id);

    const { data: bots } = await supabase
      .from("chatbots")
      .select("id, bot_name, embed_token")
      .in("workspace_id", workspaceIds)
      .order("created_at", { ascending: false });

    const list = (bots ?? []) as ChatbotOption[];
    setChatbots(list);

    const withToken = list.filter((b) => b.embed_token?.trim());
    if (withToken.length > 0 && !selectedId) {
      setSelectedId(withToken[0].id);
    } else if (list.length > 0 && !selectedId) {
      setSelectedId(list[0].id);
    }
    setIsLoading(false);
  }, [selectedId]);

  useEffect(() => {
    loadChatbots();
  }, [loadChatbots]);

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

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  if (chatbots.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1E3A5F]">
              No chatbot yet
            </CardTitle>
            <CardDescription>
              Create a chatbot first, then come back here to get the embed code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              <Link href="/onboarding">Create chatbot</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentBot = chatbots.find((c) => c.id === selectedId);
  const hasValidToken = !!currentBot?.embed_token?.trim();

  if (!hasValidToken && chatbots.length > 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1E3A5F]">
              Embed token not found
            </CardTitle>
            <CardDescription>
              This chatbot does not have an embed token. Please complete the
              onboarding flow or contact support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chatbot selector */}
      {chatbots.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#1E3A5F]">
              Select chatbot
            </CardTitle>
            <CardDescription>
              Choose which chatbot to embed. Each has its own embed code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedId ?? ""}
              onValueChange={(v) => setSelectedId(v || null)}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select chatbot" />
              </SelectTrigger>
              <SelectContent>
                {chatbots
                  .filter((b) => b.embed_token?.trim())
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.bot_name ?? "Chatbot"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Embed code card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code className="size-5 text-[#2563EB]" />
            <CardTitle className="text-lg font-bold text-[#1E3A5F]">
              Embed on your website
            </CardTitle>
          </div>
          <CardDescription>
            Paste this code in your site&apos;s footer, custom code, or just
            before the{" "}
            <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">
              &lt;/body&gt;
            </code>{" "}
            tag. Pick your platform below for exact steps.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="wordpress">WordPress</TabsTrigger>
              <TabsTrigger value="wix">Wix</TabsTrigger>
              <TabsTrigger value="squarespace">Squarespace</TabsTrigger>
              <TabsTrigger value="gtm">Google Tag Manager</TabsTrigger>
              <TabsTrigger value="html">Other / HTML</TabsTrigger>
            </TabsList>

            <TabsContent value="wordpress">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <h4 className="mb-1 text-sm font-semibold text-[#1E3A5F]">
                  WordPress (easiest — no coding)
                </h4>
                <p className="mb-3 text-xs text-slate-500">
                  Use the free WPCode plugin. About 2 minutes.
                </p>
                <ol className="flex flex-col gap-2 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <StepBadge n={1} />
                    <span>
                      Log in to WordPress admin (yoursite.com/wp-admin).
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={2} />
                    <span>
                      <strong>Plugins → Add New</strong> → search{" "}
                      <strong>WPCode</strong> → Install & Activate.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={3} />
                    <span>
                      <strong>Code Snippets → + Add Snippet → Add Your Custom
                      Code</strong>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={4} />
                    <span>
                      Name it &quot;LocalBot AI Chatbot&quot;. Code type:{" "}
                      <strong>HTML Snippet</strong>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={5} />
                    <span>
                      Paste the code above into the box.{" "}
                      <strong>Insertion</strong> →{" "}
                      <strong>Site Wide Footer</strong>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={6} />
                    <span>
                      Toggle <strong>Active</strong> → <strong>Save Snippet</strong>.
                      Done — the chat appears on every page.
                    </span>
                  </li>
                </ol>
              </div>
            </TabsContent>

            <TabsContent value="wix">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <h4 className="mb-1 text-sm font-semibold text-[#1E3A5F]">
                  Wix
                </h4>
                <p className="mb-3 text-xs text-slate-500">
                  About 2 minutes from your Wix dashboard.
                </p>
                <ol className="flex flex-col gap-2 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <StepBadge n={1} />
                    <span>
                      Wix Dashboard → <strong>Settings</strong> →{" "}
                      <strong>Custom Code</strong> (Advanced).
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={2} />
                    <span>
                      <strong>+ Add Custom Code</strong> → paste the code above.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={3} />
                    <span>
                      Name: &quot;LocalBot AI Chatbot&quot;.{" "}
                      <strong>Add Code to Pages</strong> → <strong>All Pages</strong>.
                      <strong>Place Code in</strong> → <strong>Body - end</strong>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={4} />
                    <span>
                      <strong>Apply</strong> → <strong>Publish</strong>. Chat
                      appears on every page.
                    </span>
                  </li>
                </ol>
              </div>
            </TabsContent>

            <TabsContent value="squarespace">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <h4 className="mb-1 text-sm font-semibold text-[#1E3A5F]">
                  Squarespace
                </h4>
                <p className="mb-3 text-xs text-slate-500">
                  Business plan or higher. About 1 minute.
                </p>
                <ol className="flex flex-col gap-2 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <StepBadge n={1} />
                    <span>
                      <strong>Settings</strong> → <strong>Developer Tools</strong> →{" "}
                      <strong>Code Injection</strong>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={2} />
                    <span>
                      Paste the code above into the <strong>Footer</strong> box
                      → <strong>Save</strong>. Done.
                    </span>
                  </li>
                </ol>
              </div>
            </TabsContent>

            <TabsContent value="gtm">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <h4 className="mb-1 text-sm font-semibold text-[#1E3A5F]">
                  Google Tag Manager
                </h4>
                <p className="mb-3 text-xs text-slate-500">
                  Add the widget via GTM. About 3 minutes.
                </p>
                <ol className="flex flex-col gap-2 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <StepBadge n={1} />
                    <span>Open your GTM container. <strong>Tags → New</strong>.</span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={2} />
                    <span>
                      Tag type: <strong>Custom HTML</strong>. Paste the embed code
                      above into the HTML field.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={3} />
                    <span>
                      Trigger: <strong>All Pages</strong> (or the pages where you
                      want the chat).
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={4} />
                    <span>
                      <strong>Save</strong> → <strong>Submit</strong> →{" "}
                      <strong>Publish</strong>. Done.
                    </span>
                  </li>
                </ol>
              </div>
            </TabsContent>

            <TabsContent value="html">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <h4 className="mb-1 text-sm font-semibold text-[#1E3A5F]">
                  Other (HTML, Shopify, etc.)
                </h4>
                <p className="mb-3 text-xs text-slate-500">
                  Paste the code just before the closing &lt;/body&gt; tag, or in
                  &quot;Footer scripts&quot; / &quot;Custom code&quot;.
                </p>
                <ol className="flex flex-col gap-2 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <StepBadge n={1} />
                    <span>Copy the code above.</span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={2} />
                    <span>
                      Open your site&apos;s HTML or &quot;Custom code&quot;
                      section. Find the line{" "}
                      <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">
                        &lt;/body&gt;
                      </code>
                      .
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <StepBadge n={3} />
                    <span>
                      Paste the code <strong>right above</strong>{" "}
                      <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">
                        &lt;/body&gt;
                      </code>
                      . Save. The chat will load on every page.
                    </span>
                  </li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>

          {embedToken && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
              <span className="font-medium text-slate-700">Embed token:</span>
              <code className="rounded bg-slate-200 px-2 py-0.5 font-mono text-xs text-slate-700">
                {embedToken}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick tip */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="flex items-start gap-3 pt-6">
          <MessageSquare className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">Adding new Q&As later?</p>
            <p className="mt-1 text-amber-800">
              When you add or edit questions in Knowledge Base, they are
              automatically embedded and synced. The chatbot on your website
              uses them immediately — no need to change the embed code or
              reinstall anything.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
