import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/docs/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/conversation?userId=anon-mvp&limit=50
// Returns merged conversation: interactions + Nova messages + SMS
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") ?? "anon-mvp";
    const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10));
    const client = getSupabaseClient();

    // Fetch recent interactions (user messages)
    const { data: interactions, error: iErr } = await client
      .from("interactions")
      .select("id, raw_input, timestamp")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (iErr) throw iErr;

    // Fetch Nova messages
    const { data: novaMsgs, error: nErr } = await client
      .from("nova_messages")
      .select("id, content, type, created_at, read, source_reminder_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (nErr) throw nErr;

    // Fetch SMS messages
    const { data: smsMsgs, error: sErr } = await client
      .from("sms_messages")
      .select("id, content, direction, created_at, read, phone_number")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (sErr) throw sErr;

    // Merge all messages
    const userMessages = (interactions ?? []).map((i: { id: string; raw_input: string; timestamp: string }) => ({
      id: i.id,
      role: "user" as const,
      content: i.raw_input,
      timestamp: i.timestamp,
      type: "user",
      channel: "web",
    }));

    const novaMessages = (novaMsgs ?? []).map((m: { id: string; content: string; type: string; created_at: string; read: boolean; source_reminder_id?: string }) => ({
      id: m.id,
      role: "nova" as const,
      content: m.content,
      timestamp: m.created_at,
      type: m.type,
      isCheckIn: m.type === "check-in",
      read: m.read,
      source_reminder_id: m.source_reminder_id,
      channel: "web",
    }));

    const smsInbound = (smsMsgs ?? [])
      .filter((m: { direction: string }) => m.direction === "inbound")
      .map((m: { id: string; content: string; created_at: string; read: boolean }) => ({
        id: m.id,
        role: "user" as const,
        content: m.content,
        timestamp: m.created_at,
        type: "sms",
        channel: "sms",
        read: m.read,
      }));

    const smsOutbound = (smsMsgs ?? [])
      .filter((m: { direction: string }) => m.direction === "outbound")
      .map((m: { id: string; content: string; created_at: string; read: boolean }) => ({
        id: m.id,
        role: "nova" as const,
        content: m.content,
        timestamp: m.created_at,
        type: "sms",
        channel: "sms",
        read: m.read,
      }));

    const allMessages = [...userMessages, ...novaMessages, ...smsInbound, ...smsOutbound].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return NextResponse.json({ messages: allMessages });
  } catch (e) {
    console.error("[Nova] Failed to fetch conversation:", e);
    return NextResponse.json({ messages: [] }, { status: 500 });
  }
}
