import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/docs/lib/supabase";
import { runHabitDetectionJob } from "@/docs/lib/habitScheduler";
import webpush from "web-push";

export const dynamic = "force-dynamic";

// Configure web-push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:nova@example.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

// Vercel Cron: schedule in vercel.json (e.g. */15 * * * * for every 15 min)

const CHECK_IN_MESSAGES = [
  "How's your day been?",
  "Just checking in. How are you feeling?",
  "It's been a while. Want to talk?",
  "I'm here if you need anything.",
  "How's everything going?",
];

export async function GET(req: NextRequest) {
  // Optional: require CRON_SECRET when set (for external cron or lock-down)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && cronSecret.length > 0) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const client = getSupabaseClient();
  const now = new Date();
  const nowISO = now.toISOString();
  let delivered = 0;
  let checkinsSent = 0;
  let nudgesSent = 0;
  let streaksCelebrated = 0;

  // ===== 0. HABIT DETECTION (populates habits for nudges + streak celebrations) =====
  try {
    await runHabitDetectionJob({ lookbackDays: 30 });
  } catch (e) {
    console.error("[Nova Cron] Habit detection failed:", e);
  }

  // ===== 1. DELIVER DUE REMINDERS =====
  const { data: dueReminders, error: fetchError } = await client
    .from("reminders")
    .select("id, user_id, title, datetime")
    .lte("datetime", nowISO)
    .eq("completed", false)
    .eq("delivered", false)
    .order("datetime", { ascending: true });

  if (fetchError) {
    console.error("[Nova Cron] Failed to fetch reminders:", fetchError.message);
  }

  for (const reminder of dueReminders ?? []) {
    // Insert message
    const { error: msgError } = await client.from("nova_messages").insert({
      user_id: reminder.user_id,
      content: `Reminder: ${reminder.title}`,
      type: "reminder",
      source_reminder_id: reminder.id,
    });

    if (!msgError) {
      await client.from("reminders").update({ delivered: true }).eq("id", reminder.id);
      delivered++;
      console.log("[Nova Cron] Delivered reminder:", reminder.title);

      // Send push notification
      if (vapidPublicKey && vapidPrivateKey) {
        try {
          await fetch(`${process.env.VERCEL_URL || "http://localhost:3000"}/api/push/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.CRON_SECRET || "dev-secret"}`,
            },
            body: JSON.stringify({
              userId: reminder.user_id,
              title: "Nova Reminder",
              body: reminder.title,
              type: "reminder",
              data: { reminderId: reminder.id },
            }),
          });
        } catch (e) {
          console.error("[Nova Cron] Push notification failed:", e);
        }
      }
    }
  }

  // ===== 2. SMART CHECK-INS (24h+ no interaction) =====
  // Find active users (have reminders or habits)
  const { data: activeUsers } = await client
    .from("reminders")
    .select("user_id")
    .eq("completed", false)
    .limit(100);

  const userIds = [...new Set((activeUsers ?? []).map((r: { user_id: string }) => r.user_id))];

  for (const userId of userIds) {
    // Get last interaction time
    const { data: lastInteraction } = await client
      .from("interactions")
      .select("timestamp")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(1);

    const lastMsgTime = lastInteraction?.[0]?.timestamp;
    const hoursSinceLast = lastMsgTime
      ? (now.getTime() - new Date(lastMsgTime).getTime()) / (1000 * 60 * 60)
      : 999;

    // Only send check-in if 24+ hours and no recent check-in
    if (hoursSinceLast >= 24) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: recentCheckin } = await client
        .from("nova_messages")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "check-in")
        .gte("created_at", today.toISOString())
        .limit(1);

      if (!recentCheckin || recentCheckin.length === 0) {
        const message = CHECK_IN_MESSAGES[Math.floor(Math.random() * CHECK_IN_MESSAGES.length)];
        const { error: checkinError } = await client.from("nova_messages").insert({
          user_id: userId,
          content: message,
          type: "check-in",
        });
        if (!checkinError) {
          checkinsSent++;
          console.log("[Nova Cron] Sent check-in to:", userId);
        }
      }
    }
  }

  // ===== 3. HABIT NUDGES =====
  const { data: habits } = await client
    .from("habits")
    .select("id, user_id, description, confidence_score, last_observed")
    .gte("confidence_score", 0.7)
    .order("last_observed", { ascending: false })
    .limit(10);

  for (const habit of habits ?? []) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Skip if already nudged today
    const { data: existingNudge } = await client
      .from("nova_messages")
      .select("id")
      .eq("user_id", habit.user_id)
      .eq("type", "nudge")
      .ilike("content", `%${habit.description}%`)
      .gte("created_at", today.toISOString())
      .limit(1);

    if (existingNudge && existingNudge.length > 0) continue;

    // Send nudge with probability based on confidence
    const shouldNudge = Math.random() < habit.confidence_score * 0.3;
    if (shouldNudge) {
      const { error: nudgeError } = await client.from("nova_messages").insert({
        user_id: habit.user_id,
        content: `You usually ${habit.description}. Want a nudge when it's time?`,
        type: "nudge",
      });
      if (!nudgeError) {
        nudgesSent++;
        console.log("[Nova Cron] Sent nudge for habit:", habit.description);
      }
    }
  }

  // ===== 4. HABIT STREAK CELEBRATIONS =====
  // Check for habits observed 3, 7, 30 days in a row
  const { data: allHabits } = await client
    .from("habits")
    .select("id, user_id, description, detected_pattern, last_observed, confidence_score")
    .gte("confidence_score", 0.8)
    .limit(20);

  for (const habit of allHabits ?? []) {
    try {
      const pattern = JSON.parse(habit.detected_pattern || "{}");
      const occurrenceCount = pattern.occurrenceCount || 0;

      // Check for milestones
      const milestones = [3, 7, 14, 30, 60, 100];
      const milestone = milestones.find((m) => occurrenceCount === m);

      if (milestone) {
        // Check if already celebrated
        const { data: celebrated } = await client
          .from("nova_messages")
          .select("id")
          .eq("user_id", habit.user_id)
          .eq("type", "system")
          .ilike("content", `%${milestone} days%`)
          .ilike("content", `%${habit.description}%`)
          .limit(1);

        if (!celebrated || celebrated.length === 0) {
          const messages: Record<number, string> = {
            3: `Nice! You've ${habit.description} for 3 days in a row. Keep it up!`,
            7: `A full week! You're ${habit.description} consistently. Great work!`,
            14: `Two weeks strong! ${habit.description} is becoming part of your routine.`,
            30: `Incredible! A whole month of ${habit.description}. You're building something real.`,
            60: `Two months! ${habit.description} is now who you are. Amazing consistency.`,
            100: `100 days! ${habit.description} is a permanent part of your life. I'm proud of you.`,
          };

          const { error: celebrateError } = await client.from("nova_messages").insert({
            user_id: habit.user_id,
            content: messages[milestone],
            type: "system",
          });

          if (!celebrateError) {
            streaksCelebrated++;
            console.log("[Nova Cron] Celebrated", milestone, "day streak for:", habit.description);
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return NextResponse.json({
    delivered,
    checkinsSent,
    nudgesSent,
    streaksCelebrated,
  });
}

