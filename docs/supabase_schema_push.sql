-- Web Push Notifications Schema
-- Run this in Supabase SQL Editor

-- Push subscriptions table
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
CREATE POLICY "Allow anon insert push_subscriptions" ON public.push_subscriptions
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon select push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Allow anon select push_subscriptions" ON public.push_subscriptions
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon delete push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Allow anon delete push_subscriptions" ON public.push_subscriptions
  FOR DELETE TO anon USING (true);
