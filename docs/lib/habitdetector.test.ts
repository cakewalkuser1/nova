import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  detectHabitsFromInteractions,
  type InteractionRecord,
  type DetectedHabit,
  DETECTION_DEFAULTS,
} from "./habitdetector";

const uid = "user-1";

function ts(year: number, month: number, day: number, hour: number): string {
  return new Date(year, month - 1, day, hour, 0, 0).toISOString();
}

function interaction(id: string, parsedIntent: string, timestamp: string): InteractionRecord {
  return { id, user_id: uid, raw_input: "", parsed_intent: parsedIntent, timestamp };
}

describe("detectHabitsFromInteractions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses deterministic timestamps for confidence scoring", () => {
    const list = [
      interaction("1", "call mom", ts(2025, 3, 10, 19)),
      interaction("2", "call mom", ts(2025, 3, 12, 19)),
      interaction("3", "call mom", ts(2025, 3, 14, 19)),
    ];
    const result = detectHabitsFromInteractions(list);
    expect(result).toHaveLength(1);
    const habit = result[0] as DetectedHabit;
    expect(habit.detected_pattern.lastObserved).toBe(ts(2025, 3, 14, 19));
    expect(habit.detected_pattern.hourBucket).toBe(18);
    expect(habit.detected_pattern.hourSpread).toBe(0);
  });

  it("returns empty when fewer than minOccurrences", () => {
    const list = [
      interaction("1", "call mom", ts(2025, 3, 10, 19)),
      interaction("2", "call mom", ts(2025, 3, 11, 19)),
    ];
    const result = detectHabitsFromInteractions(list);
    expect(result).toHaveLength(0);
  });

  it("returns empty when fewer than minDistinctDays", () => {
    const list = [
      interaction("1", "call mom", ts(2025, 3, 10, 19)),
      interaction("2", "call mom", ts(2025, 3, 10, 20)),
      interaction("3", "call mom", ts(2025, 3, 10, 21)),
    ];
    const result = detectHabitsFromInteractions(list);
    expect(result).toHaveLength(0);
  });

  it("detects one habit when same behavior in same 2h window across 3+ days", () => {
    const list = [
      interaction("1", "call mom", ts(2025, 3, 10, 19)),
      interaction("2", "call mom", ts(2025, 3, 12, 19)),
      interaction("3", "call mom", ts(2025, 3, 14, 19)),
    ];
    const result = detectHabitsFromInteractions(list);
    expect(result).toHaveLength(1);
    const habit = result[0] as DetectedHabit;
    expect(habit.description).toContain("call mom");
    expect(habit.detected_pattern.occurrenceCount).toBe(3);
    expect(habit.detected_pattern.distinctDays).toBe(3);
    expect(habit.confidence_score).toBeGreaterThanOrEqual(0);
    expect(habit.confidence_score).toBeLessThanOrEqual(1);
  });

  it("confidence score is in [0,1] and increases with more occurrences", () => {
    const base = [
      interaction("1", "lunch", ts(2025, 3, 10, 14)),
      interaction("2", "lunch", ts(2025, 3, 11, 14)),
      interaction("3", "lunch", ts(2025, 3, 12, 14)),
    ];
    const resultFew = detectHabitsFromInteractions(base);
    expect(resultFew).toHaveLength(1);
    const scoreFew = (resultFew[0] as DetectedHabit).confidence_score;

    const more = [
      ...base,
      interaction("4", "lunch", ts(2025, 3, 13, 14)),
      interaction("5", "lunch", ts(2025, 3, 14, 14)),
    ];
    const resultMore = detectHabitsFromInteractions(more);
    expect(resultMore).toHaveLength(1);
    const scoreMore = (resultMore[0] as DetectedHabit).confidence_score;
    expect(scoreMore).toBeGreaterThanOrEqual(scoreFew);
  });

  it("splits different behaviors into separate habits", () => {
    const list = [
      interaction("1", "call mom", ts(2025, 3, 10, 19)),
      interaction("2", "call mom", ts(2025, 3, 12, 19)),
      interaction("3", "call mom", ts(2025, 3, 14, 19)),
      interaction("4", "lunch", ts(2025, 3, 10, 14)),
      interaction("5", "lunch", ts(2025, 3, 11, 14)),
      interaction("6", "lunch", ts(2025, 3, 12, 14)),
    ];
    const result = detectHabitsFromInteractions(list);
    expect(result).toHaveLength(2);
    const descriptions = result.map((h) => (h as DetectedHabit).description);
    expect(descriptions.some((d) => d.includes("call mom"))).toBe(true);
    expect(descriptions.some((d) => d.includes("lunch"))).toBe(true);
  });

  it("respects maxHourSpread and drops wide-spread behavior", () => {
    const list = [
      interaction("1", "exercise", ts(2025, 3, 10, 7)),
      interaction("2", "exercise", ts(2025, 3, 11, 12)),
      interaction("3", "exercise", ts(2025, 3, 12, 18)),
    ];
    const result = detectHabitsFromInteractions(list, {
      ...DETECTION_DEFAULTS,
      maxHourSpread: 2,
    });
    expect(result).toHaveLength(0);
  });
});
