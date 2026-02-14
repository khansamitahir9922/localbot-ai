import { NextResponse, type NextRequest } from "next/server";
import { FirecrawlClient } from "@mendable/firecrawl-js";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

/* ─────────────────────────────────────────────────────────────
   POST /api/crawl
   Accepts : { url: string; chatbotId: string }
   Returns : { pairs: { question: string; answer: string }[] }

   1. Validates the authenticated user owns the chatbot.
   2. Crawls up to 10 pages of the given URL via Firecrawl.
   3. Sends scraped text to GPT-4o-mini to extract Q&A pairs.
   4. Returns the Q&A pairs as JSON.
   ───────────────────────────────────────────────────────────── */

const MAX_PAGES = 10;
const MAX_QA_PAIRS = 30;

/** Maximum characters of website text we'll send to GPT. */
const MAX_CONTENT_LENGTH = 60_000;

/** Timeout for the entire crawl operation (3 minutes). */
const CRAWL_TIMEOUT_MS = 180_000;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    /* ── Validate env keys ── */
    if (!process.env.FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { error: "Firecrawl API key is not configured." },
        { status: 500 }
      );
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured." },
        { status: 500 }
      );
    }

    /* ── Authenticate user ── */
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    /* ── Parse & validate body ── */
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as Record<string, unknown>).url !== "string" ||
      typeof (body as Record<string, unknown>).chatbotId !== "string"
    ) {
      return NextResponse.json(
        { error: "Request body must include 'url' (string) and 'chatbotId' (string)." },
        { status: 400 }
      );
    }

    const { url, chatbotId } = body as { url: string; chatbotId: string };

    if (!url.trim()) {
      return NextResponse.json(
        { error: "'url' must not be empty." },
        { status: 400 }
      );
    }

    /* ── Verify the user owns this chatbot ── */
    const { data: chatbot, error: chatbotError } = await supabase
      .from("chatbots")
      .select("id, workspace_id")
      .eq("id", chatbotId)
      .single();

    if (chatbotError || !chatbot) {
      return NextResponse.json(
        { error: "Chatbot not found." },
        { status: 404 }
      );
    }

    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", chatbot.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (wsError || !workspace) {
      return NextResponse.json(
        { error: "You do not have access to this chatbot." },
        { status: 403 }
      );
    }

    /* ════════════════════════════════════════════════════════════
       STEP 1 — Crawl the website with Firecrawl
       ════════════════════════════════════════════════════════════ */

    const firecrawl = new FirecrawlClient({
      apiKey: process.env.FIRECRAWL_API_KEY,
    });

    let crawlJob;
    try {
      crawlJob = await firecrawl.crawl(url, {
        limit: MAX_PAGES,
        scrapeOptions: {
          formats: ["markdown"],
        },
        timeout: CRAWL_TIMEOUT_MS / 1000,
      });
    } catch (crawlErr) {
      console.error("[/api/crawl] Firecrawl error:", crawlErr);
      return NextResponse.json(
        {
          error:
            "Failed to crawl the website. Please check the URL and try again.",
        },
        { status: 502 }
      );
    }

    /* Extract text from crawled pages */
    if (
      !crawlJob ||
      crawlJob.status !== "completed" ||
      !crawlJob.data ||
      crawlJob.data.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No content could be extracted from the website. The site might block crawlers or the URL may be invalid.",
        },
        { status: 422 }
      );
    }

    const pageTexts: string[] = crawlJob.data
      .map((page) => page.markdown || "")
      .filter((text: string) => text.trim().length > 0);

    if (pageTexts.length === 0) {
      return NextResponse.json(
        { error: "Crawl succeeded but no readable text was found on the pages." },
        { status: 422 }
      );
    }

    /* Combine and truncate to stay within GPT context limits */
    let combinedText = pageTexts.join("\n\n---\n\n");
    if (combinedText.length > MAX_CONTENT_LENGTH) {
      combinedText = combinedText.slice(0, MAX_CONTENT_LENGTH);
    }

    /* ════════════════════════════════════════════════════════════
       STEP 2 — Extract Q&A pairs with GPT-4o-mini
       ════════════════════════════════════════════════════════════ */

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are a helpful assistant that extracts frequently asked questions and their answers from website content. Focus on questions a customer would commonly ask — such as business hours, services offered, pricing, location, contact info, policies, menu items, etc. Return ONLY a JSON object with a key "pairs" containing an array of objects, each with "question" and "answer" keys. Extract up to ${MAX_QA_PAIRS} pairs. If there isn't enough content for that many, return as many as you can. Make answers concise but informative.`;

    const userPrompt = `Extract question-answer pairs from the following website content:\n\n${combinedText}`;

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 4096,
      });
    } catch (aiErr) {
      console.error("[/api/crawl] OpenAI error:", aiErr);
      return NextResponse.json(
        { error: "Failed to process the website content with AI." },
        { status: 502 }
      );
    }

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json(
        { error: "AI returned an empty response." },
        { status: 502 }
      );
    }

    /* ── Parse the JSON response ── */
    let pairs: { question: string; answer: string }[] = [];

    try {
      const parsed = JSON.parse(rawContent) as {
        pairs?: { question: string; answer: string }[];
      };

      if (Array.isArray(parsed.pairs)) {
        pairs = parsed.pairs
          .filter(
            (p) =>
              typeof p.question === "string" &&
              typeof p.answer === "string" &&
              p.question.trim().length > 0 &&
              p.answer.trim().length > 0
          )
          .slice(0, MAX_QA_PAIRS);
      }
    } catch {
      console.error("[/api/crawl] Failed to parse AI response:", rawContent);
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again." },
        { status: 502 }
      );
    }

    if (pairs.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not extract any Q&A pairs from this website. The content may not contain enough customer-relevant information.",
        },
        { status: 422 }
      );
    }

    /* ── Return the extracted pairs ── */
    return NextResponse.json({
      pairs,
      pagesScraped: pageTexts.length,
    });
  } catch (error: unknown) {
    console.error("[/api/crawl] Unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";
    return NextResponse.json(
      { error: `Crawl failed: ${message}` },
      { status: 500 }
    );
  }
}
