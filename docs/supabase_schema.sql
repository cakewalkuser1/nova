-- Run this in Supabase Dashboard: SQL Editor → New query → paste → Run
-- Creates tables and allows anonymous access for MVP (no auth yet).
-- user_id is text so "anon-mvp" works; switch to uuid when you add auth.

-- Interactions (for observation logging)
CREATE TABLE IF NOT EXISTS public.interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  raw_input text NOT NULL,
  parsed_intent text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon insert interactions" ON public.interactions;
CREATE POLICY "Allow anon insert interactions" ON public.interactions FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon select interactions" ON public.interactions;
CREATE POLICY "Allow anon select interactions" ON public.interactions FOR SELECT TO anon USING (true);

-- Reminders table (matches memory_architecture.md)
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  datetime timestamptz NOT NULL,
  recurring_rule text,
  completed boolean NOT NULL DEFAULT false,
  delivered boolean NOT NULL DEFAULT false
);

-- Nova messages: proactive messages from Nova (reminders, nudges, check-ins)
CREATE TABLE IF NOT EXISTS public.nova_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'reminder', -- reminder, nudge, check-in, system
  source_reminder_id uuid REFERENCES public.reminders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false
);

-- Allow anon to insert and select (MVP: app uses userId "anon-mvp" without auth)
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert reminders" ON public.reminders;
CREATE POLICY "Allow anon insert reminders" ON public.reminders
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon select reminders" ON public.reminders;
CREATE POLICY "Allow anon select reminders" ON public.reminders
  FOR SELECT TO anon USING (true);

-- Optional: allow anon to update (e.g. mark completed)
DROP POLICY IF EXISTS "Allow anon update reminders" ON public.reminders;
CREATE POLICY "Allow anon update reminders" ON public.reminders
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Nova messages RLS
ALTER TABLE public.nova_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon insert nova_messages" ON public.nova_messages;
CREATE POLICY "Allow anon insert nova_messages" ON public.nova_messages FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon select nova_messages" ON public.nova_messages;
CREATE POLICY "Allow anon select nova_messages" ON public.nova_messages FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon update nova_messages" ON public.nova_messages;
CREATE POLICY "Allow anon update nova_messages" ON public.nova_messages FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Push subscriptions for notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Allow anon insert push_subscriptions" ON public.push_subscriptions FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon select push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Allow anon select push_subscriptions" ON public.push_subscriptions FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon delete push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Allow anon delete push_subscriptions" ON public.push_subscriptions FOR DELETE TO anon USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_user_datetime ON public.reminders(user_id, datetime);
CREATE INDEX IF NOT EXISTS idx_interactions_user_timestamp ON public.interactions(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_nova_messages_user_created ON public.nova_messages(user_id, created_at);

-- SMS/Messages via Twilio
CREATE TABLE IF NOT EXISTS public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  phone_number text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content text NOT NULL,
  twilio_sid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false
);

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert sms_messages" ON public.sms_messages;
CREATE POLICY "Allow anon insert sms_messages" ON public.sms_messages FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon select sms_messages" ON public.sms_messages;
CREATE POLICY "Allow anon select sms_messages" ON public.sms_messages FOR SELECT TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_sms_messages_user_phone ON public.sms_messages(user_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created ON public.sms_messages(created_at);

-- Habits (detected from interactions; used by cron for nudges and streak celebrations)
CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  description text NOT NULL,
  detected_pattern text NOT NULL,
  confidence_score double precision NOT NULL,
  last_observed timestamptz NOT NULL
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert habits" ON public.habits FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select habits" ON public.habits FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update habits" ON public.habits FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_confidence ON public.habits(confidence_score);

-- Memories (person, preference, event from chat memory_fact intents)
CREATE TABLE IF NOT EXISTS public.memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL,
  content text NOT NULL,
  importance_score double precision NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert memories" ON public.memories FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select memories" ON public.memories FOR SELECT TO anon USING (true);
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON public.memories(user_id);

-- People (from memory_fact person intents with name/relationship)
CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  relationship text NOT NULL DEFAULT '',
  last_interaction timestamptz NOT NULL DEFAULT now(),
  importance_score double precision NOT NULL DEFAULT 0.5
);
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert people" ON public.people FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select people" ON public.people FOR SELECT TO anon USING (true);
CREATE INDEX IF NOT EXISTS idx_people_user_id ON public.people(user_id);

-- Recommendations (Nova-generated: movies, videos, music, posts)
CREATE TABLE IF NOT EXISTS public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('movie', 'video', 'music', 'post')),
  title text NOT NULL,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert recommendations" ON public.recommendations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select recommendations" ON public.recommendations FOR SELECT TO anon USING (true);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_created ON public.recommendations(user_id, created_at);
