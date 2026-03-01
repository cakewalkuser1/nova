# Nova: Unique Prompt & Autonomous Recommendations — Implementation Plan

## Goal

- Give Nova a **distinct, non-robotic** voice via a single system prompt (no fine-tuning).
- Enable **autonomous recommendations** (movies, videos, music, posts) that improve as Nova learns the user (memories, preferences, people).
- Keep existing behavior: reminders, memory_fact storage, emotional check-ins, recall.

---

## 1. Nova System Prompt (Draft)

Use this as the single source of personality and behavior. Place it in code or a dedicated file and inject dynamic context (memories, people) at runtime.

```
You are Nova — a calm, present companion. You're not an assistant or a tool; you're someone who listens, remembers, and sometimes suggests things because they reminded you of the person you're talking to.

Voice and tone:
- Warm but not saccharine. Short sentences. Occasional gentle humor.
- Never list bullet points unless the user explicitly asks. Prefer a few flowing lines.
- If you don't know something, say so simply. No "I'd be happy to..." or "Certainly!"
- You can say "I don't know" or "I'm not sure" when that's true.

What you know:
- You have access to notes about this user: people they care about, preferences they've shared, and past events they told you. Use this to sound like you know them. Reference it sparingly and naturally — never dump a list of facts.

What you can do:
- Reminders: if they ask to be reminded, you'll store it (they'll get a confirmation).
- Memories: if they share something about themselves, someone in their life, or a preference, you'll remember it.
- Recommendations: when it feels right — not every message — you may suggest a movie, a video, a song, or a post. Base it on what they like, what they've said, or the mood of the conversation. One suggestion at a time is enough. When you recommend something, you must output a single line in this exact format so the app can save it:
  RECOMMEND:<type>|<title>|<url or "none">
  where type is one of: movie, video, music, post
  Example: RECOMMEND:movie|Past Lives|https://example.com/past-lives
  Example: RECOMMEND:music|"Orange" by Blondshell|none
  Only use this line when you're actually recommending something. No placeholder or fake suggestions.

Rules:
- Keep replies concise (a few sentences). This is chat, not email.
- Don't repeat the user's words back unnecessarily.
- Don't announce "I've saved that" for reminders or memories — the app will confirm; you can just respond naturally to what they said.
```

**Implementation note:** The app will prepend a "Context" block to this prompt with the user's recent memories and people (see §3). The model sees: `[Context]\n...\n\n[System prompt above]\n\n[Conversation]`.

---

## 2. File and Module Structure

| Item | Purpose |
|------|--------|
| `docs/prompts/nova-system.txt` or in-code constant | Single source for the Nova system prompt (above). |
| `docs/lib/buildNovaContext.ts` | Builds the context string from DB: memories, people, optional recent reminders. |
| `docs/lib/parseRecommendations.ts` | Parses `RECOMMEND:type|title|url` lines from LLM reply; returns `{ cleanReply, items: { type, title, url }[] }`. |
| `app/api/chat/route.ts` | Uses context + system prompt; one LLM call for reply; persists reminders/memories (unchanged); parses RECOMMEND, stores in DB; returns `{ reply, reminderCreated, memoryStored, recommendationsAdded? }`. |
| `app/api/recommendations/route.ts` | GET: returns `{ items }` from `recommendations` table for the current user (and optionally type filter). |
| DB: `recommendations` table | Stores Nova-generated recommendations (see §4). |

Optional: a small **intent** step still runs first (reminder vs memory_fact vs general) so the app can do DB writes (reminders, memories) before or in parallel with the generative reply. The plan below assumes **one** main LLM call that both generates the reply and may emit RECOMMEND lines; intent can remain for structured extraction only.

---

## 3. Context Builder (RAG-style injection)

**Function:** `buildNovaContext(userId: string, supabaseClient): Promise<string>`

- Read from DB:
  - **Memories:** last N (e.g. 15) for `user_id`, ordered by `created_at` or `importance_score`. Format: `Preference/Event/Person: <content>`.
  - **People:** all (or top by importance) for `user_id`. Format: `Person: <name> (<relationship>)`.
- Optional: **Recent reminders** (e.g. next 3) so Nova can say "you have X coming up" if relevant.
- Output a single string, e.g.:

```
Context about this user (use only to sound like you know them; do not list these out):
- Person: Maya (sister). Preference: loves slow-burn sci-fi and character-driven films. Event: mentioned starting pottery class in March.
```

No bullet dump to the user — this is for the model only. Keep the context block short (e.g. under ~500 words) so the prompt doesn’t explode.

---

## 4. Recommendations: Schema and Flow

**New table: `recommendations`**

```sql
CREATE TABLE IF NOT EXISTS public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('movie', 'video', 'music', 'post')),
  title text NOT NULL,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- RLS and index: user_id, created_at
```

**Flow:**

1. User sends a message → app builds context and sends to LLM with system prompt (§1).
2. LLM returns a reply that may contain zero or more lines: `RECOMMEND:movie|Title|url` (or `none`).
3. `parseRecommendations(reply)` strips those lines from the reply and returns:
   - `cleanReply`: reply text without RECOMMEND lines (and without the line break before/after).
   - `items`: `[{ type, title, url?: string }]`.
4. For each item, insert into `recommendations` for the current `user_id`.
5. Return to client: `{ reply: cleanReply, reminderCreated, memoryStored, recommendationsAdded: items.length }`.
6. **For You** already calls `GET /api/recommendations` and expects `{ items: { id, title, url? }[] }`. Implement GET to select from `recommendations` by `user_id`, order by `created_at desc`, limit 20; map to `{ id, title, url }` (add `type` to the interface if you want to show an icon per type).

---

## 5. Chat Route: High-Level Flow

1. **Optional intent step (unchanged):** Extract reminder / memory_fact so you can write to `reminders` and `memories` (and `people`) as today. This can stay as a small, fast classifier.
2. **Context:** `buildNovaContext(userId, client)`.
3. **System message:** `contextBlock + "\n\n" + novaSystemPrompt`.
4. **User message:** current `message`.
5. **Optional:** If you have recent conversation history in DB, append last 5–10 turns as assistant/user messages for continuity.
6. **One LLM call:** Chat completion with system + conversation; no `response_format: json` — free-form text so Nova’s voice stays natural.
7. **Parse RECOMMEND** from the assistant reply; insert into `recommendations`; compute `cleanReply`.
8. **Response:** `{ reply: cleanReply, reminderCreated, memoryStored, recommendationsAdded }`. If you still use intent for reminders/memories, keep returning `reminderCreated` and `memoryStored` from that step.

---

## 6. Parsing RECOMMEND (Spec)

- **Regex or line-scan:** Look for lines that start with `RECOMMEND:` (after trimming).
- **Format:** `RECOMMEND:<type>|<title>|<url or none>`
  - `type`: must be one of `movie`, `video`, `music`, `post`.
  - `title`: rest of second field; may contain punctuation (e.g. `"Song" by Artist`). Allow empty in edge case but normally require non-empty.
  - `url`: third field; if the literal string `none` or empty, store `null` in DB.
- **Clean reply:** Remove each such line (and any single trailing/leading newline left behind) so the user only sees the natural-language reply.
- **Dedupe:** Optionally avoid inserting the same `(user_id, type, title)` within the last 24h to prevent spam if the model repeats.

---

## 7. For You and API Shape

- **GET /api/recommendations:** Query param `userId` (or from session). Return `{ items: { id, title, url?, type? }[] }` for that user, newest first. For You already supports `id`, `title`, `url`; adding `type` allows different icons (movie/music/video/post) later.
- **For You component:** No change required for MVP; once `/api/recommendations` reads from the new table, new recommendations will appear as Nova suggests them.

---

## 8. Out of Scope (By Your Choice)

- **Fine-tuning:** Not in this plan.
- **Real-time search/APIs** for movies/music: Not required for MVP. Nova can recommend by name/title only; `url` can be empty or a generic search link (e.g. “search for this on Spotify”) until you add real APIs.

---

## 9. Implementation Checklist

- [ ] Add `recommendations` table and RLS to `docs/supabase_schema.sql`.
- [ ] Create `docs/prompts/nova-system.txt` (or constant) with the system prompt.
- [ ] Implement `docs/lib/buildNovaContext.ts` (memories + people; optional reminders).
- [ ] Implement `docs/lib/parseRecommendations.ts` (parse RECOMMEND lines, return cleanReply + items).
- [ ] Update `app/api/chat/route.ts`: build context, build system message, one generative LLM call, parse RECOMMEND, insert recommendations, return cleanReply and counts.
- [ ] Implement GET `app/api/recommendations/route.ts` from `recommendations` table (by user_id).
- [ ] Optional: add `type` to For You UI (icon or label per type).
- [ ] Optional: keep intent classifier for reminder/memory_fact only; ensure reminder/memory DB writes still happen and reply still uses generative text from the main call.

---

## 10. Tone and Uniqueness Notes

- The prompt avoids corporate phrases (“I’d be happy to”, “Certainly”, “Is there anything else?”).
- Nova can say “I don’t know” and keep answers short.
- Recommendations are **autonomous** (Nova decides when) and **personal** (based on context); one at a time keeps the experience calm.
- Storing RECOMMEND in the DB and showing in For You ties the conversational experience to the “For You” surface so it feels like Nova is leaving things for the user to try, not just saying them once.

This plan keeps planning only: no code edits. When you’re ready, implement in the order of the checklist above.
