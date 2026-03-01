import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/docs/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    const client = getSupabaseClient();

    const { error } = await client.from("push_subscriptions").delete().eq("endpoint", endpoint);

    if (error) {
      console.error("[Nova Push] Unsubscribe failed:", error.message);
      return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[Nova Push] Unsubscribe error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
