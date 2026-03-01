import { getSupabaseClient } from "./supabase";
import { detectHabitsForUser, upsertDetectedHabits } from "./habitdetector";

const DEFAULT_LOOKBACK_DAYS = 30;

/**
 * Fetches user IDs that have at least one interaction in the lookback window (active users).
 */
async function getActiveUserIds(lookbackDays: number): Promise<string[]> {
  const client = getSupabaseClient();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - lookbackDays);
  const fromISO = fromDate.toISOString();

  const { data, error } = await client
    .from("interactions")
    .select("user_id")
    .gte("timestamp", fromISO);

  if (error) throw error;

  const seen = new Set<string>();
  for (const row of data ?? []) {
    const uid = (row as { user_id: string }).user_id;
    if (uid) seen.add(uid);
  }
  return Array.from(seen);
}

/**
 * Runs habit detection for all active users and upserts results into the habits table.
 * Intended to be called by a cron scheduler (e.g. daily).
 */
export async function runHabitDetectionJob(options?: {
  lookbackDays?: number;
}): Promise<{ usersProcessed: number; habitsInserted: number; habitsUpdated: number; errors: Error[] }> {
  const lookbackDays = options?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const userIds = await getActiveUserIds(lookbackDays);

  let habitsInserted = 0;
  let habitsUpdated = 0;
  const errors: Error[] = [];

  for (const userId of userIds) {
    try {
      const habits = await detectHabitsForUser(userId, { lookbackDays });
      const result = await upsertDetectedHabits(userId, habits);
      habitsInserted += result.inserted;
      habitsUpdated += result.updated;
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }
  }

  return {
    usersProcessed: userIds.length,
    habitsInserted,
    habitsUpdated,
    errors,
  };
}
