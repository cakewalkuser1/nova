import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildNovaContext } from "@/docs/lib/buildNovaContext";
import { logObservation } from "@/docs/lib/observationLogger";
import { NOVA_SYSTEM_PROMPT } from "@/docs/lib/novaPrompt";
import { parseRecommendations } from "@/docs/lib/parseRecommendations";
import { searchWeb, formatSearchResultForModel } from "@/docs/lib/search";
import { getSupabaseClient } from "@/docs/lib/supabase";

export const dynamic = "force-dynamic";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const DEFAULT_USER = "anon-mvp";
const MAX_TOOL_ITERATIONS = 3;

const webSearchToolDefinition = {
  type: "function" as const,
  function: {
    name: "web_search",
    description:
      "Search the web for current information. Use when you need up-to-date facts, a link for a movie/song/article, or when the user asks something you're not sure about.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        max_results: { type: "number", description: "Max results (1-10)", default: 5 },
        topic: { type: "string", enum: ["general", "news"], description: "general or news" },
      },
      required: ["query"],
    },
  },
};

type Intent =
  | { type: "reminder"; title: string; datetime: string; person?: string }
  | { type: "memory_fact"; kind: "person" | "preference" | "event"; content: string; name?: string; relationship?: string }
  | { type: "greeting" }
  | { type: "emotional_checkin" }
  | { type: "question" }
  | { type: "other" };

async function extractIntent(message: string): Promise<Intent> {
  if (!openai) {
    const lower = message.toLowerCase();
    if (/\bremind\b|\btomorrow\b|\blater\b|\bcall\b|\bmom\b|\bdad\b/.test(lower))
      return { type: "reminder", title: message.slice(0, 200), datetime: new Date(Date.now() + 86400000).toISOString() };
    return { type: "other" };
  }
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an intent classifier for a calm AI companion. Reply with JSON only, no markdown.
Options: reminder (extract title and when), memory_fact (person/preference/event + content, optional name/relationship), greeting, emotional_checkin, question, other.`,
      },
      { role: "user", content: message },
    ],
    response_format: { type: "json_object" },
    max_tokens: 200,
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    if (j.type === "reminder")
      return {
        type: "reminder",
        title: (j.title as string) ?? message.slice(0, 200),
        datetime: (j.datetime as string) ?? new Date(Date.now() + 86400000).toISOString(),
        person: j.person as string | undefined,
      };
    if (j.type === "memory_fact")
      return {
        type: "memory_fact",
        kind: ((j.kind as string) ?? "preference") as "person" | "preference" | "event",
        content: (j.content as string) ?? message,
        name: j.name as string | undefined,
        relationship: j.relationship as string | undefined,
      };
    if (j.type === "greeting") return { type: "greeting" };
    if (j.type === "emotional_checkin") return { type: "emotional_checkin" };
    if (j.type === "question") return { type: "question" };
  } catch {
    // ignore parse errors
  }
  return { type: "other" };
}

function isRecallQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\bwhat did i (ask|say|tell)\b/.test(lower) ||
    /\bwhat (did|do) (i|you) (ask|say|remind)\b/.test(lower) ||
    /\bremind me what\b/.test(lower) ||
    /\bwhat('s| is) my (reminder|task)\b/.test(lower)
  );
}

async function getRecentReminders(client: ReturnType<typeof getSupabaseClient>, userId: string, limit = 5) {
  const { data } = await client
    .from("reminders")
    .select("id, title, datetime, completed")
    .eq("user_id", userId)
    .eq("completed", false)
    .order("datetime", { ascending: true })
    .limit(limit);
  return (data ?? []) as { id: string; title: string; datetime: string; completed: boolean }[];
}

function buildFallbackReply(
  message: string,
  intent: Intent,
  reminderCreated: boolean,
  memoryStored: boolean,
  recallReminders: { title: string; datetime: string }[]
): string {
  if (intent.type === "reminder" && reminderCreated)
    return "I'll remind you. I've got it.";
  if (intent.type === "reminder" && !reminderCreated)
    return "I couldn't save that reminder right now. Try again in a moment.";
  if (intent.type === "memory_fact" && memoryStored)
    return "Noted. I'll remember that.";
  if (intent.type === "greeting")
    return "Hi. How can I help today?";
  if (intent.type === "emotional_checkin")
    return "I'm here if you want to talk. No pressure.";
  const askingWhatTheyAsked = intent.type === "question" || (intent.type === "other" && isRecallQuestion(message));
  if (askingWhatTheyAsked && recallReminders.length > 0)
    return recallReminders.length === 1
      ? `You asked me to remind you: ${recallReminders[0].title}.`
      : `You asked me to remind you about ${recallReminders.length} things: ${recallReminders.map((r) => r.title).join("; ")}.`;
  if (askingWhatTheyAsked)
    return "I don't have any reminders from you yet. Tell me what you'd like me to remember.";
  return "Got it. Anything else?";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const userId = typeof body.userId === "string" ? body.userId : DEFAULT_USER;
    if (!message) {
      return NextResponse.json({ reply: "Say something when you're ready." }, { status: 200 });
    }

    const intent = await extractIntent(message);
    const parsedIntent =
      intent.type === "reminder"
        ? `reminder: ${intent.title}`
        : intent.type === "memory_fact"
          ? `memory: ${intent.kind}: ${intent.content}`
          : intent.type;

    await logObservation({
      user_id: userId,
      raw_input: message,
      parsed_intent: parsedIntent,
    });

    let reminderCreated = false;
    let memoryStored = false;

    const client = getSupabaseClient();

    if (intent.type === "reminder") {
      const { error } = await client.from("reminders").insert({
        user_id: userId,
        title: intent.title,
        datetime: intent.datetime,
        recurring_rule: null,
        completed: false,
      });
      if (error) {
        console.error("[Nova] Reminder insert failed:", error.message, error.details);
      }
      reminderCreated = !error;
    }

    if (intent.type === "memory_fact") {
      const { error } = await client.from("memories").insert({
        user_id: userId,
        type: intent.kind.toUpperCase(),
        content: intent.content,
        importance_score: 0.5,
      });
      memoryStored = !error;
      if (memoryStored && intent.kind === "person" && intent.name) {
        const now = new Date().toISOString();
        await client.from("people").insert({
          user_id: userId,
          name: intent.name,
          relationship: intent.relationship ?? "",
          last_interaction: now,
          importance_score: 0.5,
        });
      }
    }

    const recentReminders = await getRecentReminders(client, userId);

    if (!openai) {
      const reply = buildFallbackReply(message, intent, reminderCreated, memoryStored, recentReminders);
      return NextResponse.json({
        reply,
        reminderCreated,
        memoryStored,
        isCheckIn: intent.type === "emotional_checkin",
      });
    }

    const contextBlock = await buildNovaContext(userId, client);
    const systemContent = contextBlock + "\n\n" + NOVA_SYSTEM_PROMPT;

    const hasSearch = Boolean(process.env.TAVILY_API_KEY?.trim());
    const tools = hasSearch ? [webSearchToolDefinition] : undefined;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemContent },
      { role: "user", content: message },
    ];

    let lastMessage: { content: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } = { content: null };
    let iterations = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 800,
        ...(tools ? { tools, tool_choice: "auto" as const } : {}),
      });

      const choice = completion.choices[0];
      if (!choice?.message) {
        lastMessage = { content: "Something went wrong. Try again." };
        break;
      }

      const msg = choice.message;
      lastMessage = { content: msg.content ?? null, tool_calls: msg.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }> | undefined };

      messages.push({
        role: "assistant",
        content: msg.content ?? undefined,
        tool_calls: msg.tool_calls,
      } as ChatCompletionMessageParam);

      const toolCalls = msg.tool_calls?.filter((tc) => tc.function?.name === "web_search") ?? [];
      if (toolCalls.length === 0) {
        break;
      }

      const toolResults: ChatCompletionMessageParam[] = [];
      for (const tc of toolCalls) {
        let args: { query?: string; max_results?: number; topic?: string } = {};
        try {
          args = JSON.parse(tc.function?.arguments ?? "{}") as typeof args;
        } catch {
          // ignore
        }
        const query = typeof args.query === "string" ? args.query : message;
        const searchPayload = await searchWeb(query, {
          maxResults: typeof args.max_results === "number" ? args.max_results : 5,
          topic: args.topic === "news" ? "news" : "general",
        });
        const content = formatSearchResultForModel(searchPayload);
        toolResults.push({
          role: "tool",
          tool_call_id: tc.id,
          content,
        });
      }
      messages.push(...toolResults);
      iterations++;
    }

    let replyText = lastMessage.content?.trim() ?? "Got it. Anything else?";
    const { cleanReply, items: recommendationItems } = parseRecommendations(replyText);
    replyText = cleanReply || replyText;

    let recommendationsAdded = 0;
    for (const item of recommendationItems) {
      const { error } = await client.from("recommendations").insert({
        user_id: userId,
        type: item.type,
        title: item.title,
        url: item.url,
      });
      if (!error) recommendationsAdded++;
    }

    return NextResponse.json({
      reply: replyText,
      reminderCreated,
      memoryStored,
      recommendationsAdded,
      isCheckIn: intent.type === "emotional_checkin",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { reply: "Something went wrong. Try again in a moment." },
      { status: 500 }
    );
  }
}
