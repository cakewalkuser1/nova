import { getSupabaseClient, type HabitRow } from "./supabase";

export const DETECTION_DEFAULTS = {
  lookbackDays: 30,
  minOccurrences: 3,
  minDistinctDays: 3,
  maxHourSpread: 2,
  confidenceWeights: { frequency: 0.5, consistency: 0.3, recency: 0.2 },
} as const;

export type DetectionOptions = Partial<{
  lookbackDays: number;
  minOccurrences: number;
  minDistinctDays: number;
  maxHourSpread: number;
  confidenceWeights: { frequency: number; consistency: number; recency: number };
}>;

export interface InteractionRecord {
  id: string;
  user_id: string;
  raw_input: string;
  parsed_intent: string;
  timestamp: string;
}

export interface DetectedPattern {
  behaviorKey: string;
  hourBucket: number;
  hourSpread: number;
  dayOfWeekCount: number;
  occurrenceCount: number;
  distinctDays: number;
  lastObserved: string;
  firstObserved: string;
}

export interface DetectedHabit {
  description: string;
  detected_pattern: DetectedPattern;
  confidence_score: number;
  last_observed: string;
  patternKey: string;
}

function normalizeBehaviorKey(parsedIntent: string): string {
  const s = (parsedIntent ?? "").trim().toLowerCase();
  return s || "unknown";
}

function getHourBucket(isoTimestamp: string): number {
  return new Date(isoTimestamp).getHours();
}

function getDayOfWeek(isoTimestamp: string): number {
  return new Date(isoTimestamp).getDay();
}

/**
 * Computes confidence in [0, 1]: frequency + consistency + recency.
 */
function computeConfidence(
  occurrenceCount: number,
  distinctDays: number,
  hourSpread: number,
  lastObserved: string,
  opts: typeof DETECTION_DEFAULTS | DetectionOptions
): number {
  const { minOccurrences, minDistinctDays, maxHourSpread, confidenceWeights } = { ...DETECTION_DEFAULTS, ...opts };
  const w = confidenceWeights;

  const frequencyScore = Math.min(1, occurrenceCount / Math.max(1, minOccurrences + 2));
  const consistencyScore =
    distinctDays >= minDistinctDays
      ? Math.max(0, 1 - hourSpread / Math.max(1, maxHourSpread + 1))
      : distinctDays / Math.max(1, minDistinctDays);
  const daysSince = (Date.now() - new Date(lastObserved).getTime()) / (24 * 60 * 60 * 1000);
  const recencyScore = Math.max(0, 1 - daysSince / 14);

  return Math.min(1, w.frequency * frequencyScore + w.consistency * consistencyScore + w.recency * recencyScore);
}

/**
 * Builds a stable key for matching habits (same behavior + similar time → same habit).
 */
function buildPatternKey(behaviorKey: string, hourBucket: number): string {
  return `${behaviorKey}|${hourBucket}`;
}

/**
 * Pure function: given a list of interactions, returns detected habits with confidence scores.
 * Used for testing and by detectHabitsForUser after fetching from DB.
 */
export function detectHabitsFromInteractions(
  interactions: InteractionRecord[],
  options: DetectionOptions = {}
): DetectedHabit[] {
  const opts = { ...DETECTION_DEFAULTS, ...options };
  if (interactions.length < opts.minOccurrences) return [];

  const twoHourBucket = (h: number) => Math.floor(h / 2) * 2;
  const byKey = new Map<string, { hours: number[]; days: Set<number>; last: string; first: string }>();

  for (const r of interactions) {
    const behaviorKey = normalizeBehaviorKey(r.parsed_intent);
    const hour = getHourBucket(r.timestamp);
    const day = getDayOfWeek(r.timestamp);
    const bucketKey = `${behaviorKey}|${twoHourBucket(hour)}`;

    if (!byKey.has(bucketKey)) {
      byKey.set(bucketKey, { hours: [], days: new Set(), last: r.timestamp, first: r.timestamp });
    }
    const b = byKey.get(bucketKey)!;
    b.hours.push(hour);
    b.days.add(day);
    if (r.timestamp > b.last) b.last = r.timestamp;
    if (r.timestamp < b.first) b.first = r.timestamp;
  }

  const results: DetectedHabit[] = [];

  for (const [bucketKey, stats] of byKey.entries()) {
    const behaviorKey = bucketKey.split("|")[0] ?? "unknown";
    const occurrenceCount = stats.hours.length;
    const distinctDays = stats.days.size;
    if (occurrenceCount < opts.minOccurrences || distinctDays < opts.minDistinctDays) continue;

    const hourSpread = Math.max(...stats.hours) - Math.min(...stats.hours);
    if (hourSpread > opts.maxHourSpread) continue;

    const sortedHours = stats.hours.slice().sort((a, b) => a - b);
    const medianHour = sortedHours[Math.floor(sortedHours.length / 2)] ?? 0;
    const confidence = computeConfidence(
      occurrenceCount,
      distinctDays,
      hourSpread,
      stats.last,
      opts
    );

    const hourBucketStored = twoHourBucket(medianHour);
    const pattern: DetectedPattern = {
      behaviorKey,
      hourBucket: hourBucketStored,
      hourSpread,
      dayOfWeekCount: distinctDays,
      occurrenceCount,
      distinctDays,
      lastObserved: stats.last,
      firstObserved: stats.first,
    };

    const patternKey = bucketKey;
    results.push({
      description: `${behaviorKey} around ${medianHour}:00`,
      detected_pattern: pattern,
      confidence_score: Math.round(confidence * 100) / 100,
      last_observed: stats.last,
      patternKey,
    });
  }

  return results;
}

/**
 * Fetches recent interactions for a user and returns detected habits with confidence scores.
 */
export async function detectHabitsForUser(
  userId: string,
  options: DetectionOptions = {}
): Promise<DetectedHabit[]> {
  const opts = { ...DETECTION_DEFAULTS, ...options };
  const client = getSupabaseClient();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - opts.lookbackDays);
  const fromISO = fromDate.toISOString();

  const { data: rows, error } = await client
    .from("interactions")
    .select("id, user_id, raw_input, parsed_intent, timestamp")
    .eq("user_id", userId)
    .gte("timestamp", fromISO)
    .order("timestamp", { ascending: true });

  if (error) throw error;
  const interactions = (rows ?? []) as InteractionRecord[];
  return detectHabitsFromInteractions(interactions, opts);
}

/**
 * Writes detected habits to the habits table: insert new or update existing by pattern key.
 */
export async function upsertDetectedHabits(
  userId: string,
  habits: DetectedHabit[]
): Promise<{ inserted: number; updated: number; error?: Error }> {
  if (habits.length === 0) return { inserted: 0, updated: 0 };
  const client = getSupabaseClient();

  const { data: existing } = await client
    .from("habits")
    .select("id, detected_pattern")
    .eq("user_id", userId);

  const existingByPatternKey = new Map<string, { id: string }>();
  for (const row of existing ?? []) {
    try {
      const p = JSON.parse((row as { detected_pattern: string }).detected_pattern) as DetectedPattern;
      const key = buildPatternKey(p.behaviorKey, p.hourBucket);
      existingByPatternKey.set(key, { id: (row as { id: string }).id });
    } catch {
      // ignore malformed
    }
  }

  let inserted = 0;
  let updated = 0;

  for (const h of habits) {
    const row: Omit<HabitRow, "id"> = {
      user_id: userId,
      description: h.description,
      detected_pattern: JSON.stringify(h.detected_pattern),
      confidence_score: h.confidence_score,
      last_observed: h.last_observed,
    };
    const existingRow = existingByPatternKey.get(h.patternKey);
    if (existingRow) {
      const { error } = await client
        .from("habits")
        .update({
          description: row.description,
          detected_pattern: row.detected_pattern,
          confidence_score: row.confidence_score,
          last_observed: row.last_observed,
        })
        .eq("id", existingRow.id);
      if (!error) updated++;
    } else {
      const { error } = await client.from("habits").insert(row);
      if (!error) inserted++;
    }
  }

  return { inserted, updated };
}
