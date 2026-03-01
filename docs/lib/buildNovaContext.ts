import type { SupabaseClient } from "@supabase/supabase-js";

const MEMORIES_LIMIT = 15;
const PEOPLE_LIMIT = 20;
const REMINDERS_LIMIT = 3;

export async function buildNovaContext(
  userId: string,
  client: SupabaseClient
): Promise<string> {
  const parts: string[] = [];

  const { data: memories } = await client
    .from("memories")
    .select("type, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MEMORIES_LIMIT);

  const { data: people } = await client
    .from("people")
    .select("name, relationship")
    .eq("user_id", userId)
    .order("importance_score", { ascending: false })
    .limit(PEOPLE_LIMIT);

  const { data: reminders } = await client
    .from("reminders")
    .select("title, datetime")
    .eq("user_id", userId)
    .eq("completed", false)
    .order("datetime", { ascending: true })
    .limit(REMINDERS_LIMIT);

  const lines: string[] = [];
  if (people?.length) {
    for (const p of people) {
      const rel = p.relationship ? ` (${p.relationship})` : "";
      lines.push(`Person: ${p.name}${rel}.`);
    }
  }
  if (memories?.length) {
    for (const m of memories) {
      const label = (m.type || "preference").toLowerCase();
      lines.push(`${label.charAt(0).toUpperCase() + label.slice(1)}: ${m.content}`);
    }
  }
  if (reminders?.length) {
    lines.push("Upcoming reminders: " + reminders.map((r) => r.title).join("; "));
  }

  if (lines.length === 0) {
    return "Context about this user (use only to sound like you know them): None yet.";
  }
  return (
    "Context about this user (use only to sound like you know them; do not list these out):\n- " +
    lines.join("\n- ")
  );
}
