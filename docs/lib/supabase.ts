import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface InteractionRow {
  id?: string;
  user_id: string;
  raw_input: string;
  parsed_intent: string;
  timestamp: string;
}

export interface HabitRow {
  id?: string;
  user_id: string;
  description: string;
  detected_pattern: string;
  confidence_score: number;
  last_observed: string;
}

export function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase URL or key. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  return createClient(url, key);
}
