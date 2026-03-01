import { getSupabaseClient, type InteractionRow } from "./supabase";

export interface ObservationInput {
  user_id: string;
  raw_input: string;
  parsed_intent: string;
  timestamp?: string;
}

/**
 * Inserts a single observation into the interactions table.
 * Uses provided timestamp or current ISO time.
 */
export async function logObservation(input: ObservationInput): Promise<{ id?: string; error?: Error }> {
  const client = getSupabaseClient();
  const row: InteractionRow = {
    user_id: input.user_id,
    raw_input: input.raw_input,
    parsed_intent: input.parsed_intent,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
  const { data, error } = await client.from("interactions").insert(row).select("id").single();
  if (error) return { error };
  return { id: data?.id };
}

/**
 * Inserts multiple observations in one request (e.g. for imports/backfills).
 */
export async function logBatchObservations(
  inputs: ObservationInput[]
): Promise<{ inserted: number; ids: string[]; error?: Error }> {
  if (inputs.length === 0) return { inserted: 0, ids: [] };
  const client = getSupabaseClient();
  const now = new Date().toISOString();
  const rows: InteractionRow[] = inputs.map((i) => ({
    user_id: i.user_id,
    raw_input: i.raw_input,
    parsed_intent: i.parsed_intent,
    timestamp: i.timestamp ?? now,
  }));
  const { data, error } = await client.from("interactions").insert(rows).select("id");
  if (error) return { inserted: 0, ids: [], error };
  const ids = (data ?? []).map((r: { id: string }) => r.id);
  return { inserted: ids.length, ids };
}
