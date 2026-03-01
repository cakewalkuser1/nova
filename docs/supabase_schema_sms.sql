-- SMS/Messages via Twilio Schema
-- Run this in Supabase SQL Editor

-- SMS conversations table
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

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_sms_messages_user_phone ON public.sms_messages(user_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created ON public.sms_messages(created_at);
