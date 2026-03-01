import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/docs/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const reminderId = body.reminderId as string | undefined;

    if (!reminderId) {
      return NextResponse.json({ error: "Missing reminderId" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // Mark reminder as completed
    const { error } = await client
      .from("reminders")
      .update({ completed: true })
      .eq("id", reminderId);

    if (error) {
      console.error("[Nova] Failed to complete reminder:", error.message);
      return NextResponse.json({ error: "Failed to complete" }, { status: 500 });
    }

    // Update associated nova_messages with plain values (Supabase update() accepts only static values)
    const { data: relatedMessages } = await client
      .from("nova_messages")
      .select("id, content")
      .eq("source_reminder_id", reminderId);

    for (const row of relatedMessages ?? []) {
      const newContent = (row.content ?? "").replace(/^Reminder:\s*/i, "Done: ");
      await client
        .from("nova_messages")
        .update({ content: newContent })
        .eq("id", row.id);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[Nova] Complete reminder error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
