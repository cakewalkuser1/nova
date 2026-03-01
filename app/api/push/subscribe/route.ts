import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/docs/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, subscription } = body;

    if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = getSupabaseClient();

    const { error } = await client.from("push_subscriptions").insert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });

    if (error) {
      // If unique constraint violation, update instead
      if (error.message?.includes("unique constraint")) {
        const { error: updateError } = await client
          .from("push_subscriptions")
          .update({
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            last_used: new Date().toISOString(),
          })
          .eq("endpoint", subscription.endpoint);

        if (updateError) {
          console.error("[Nova Push] Update failed:", updateError.message);
          return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
        }
        return NextResponse.json({ success: true, updated: true });
      }

      console.error("[Nova Push] Subscribe failed:", error.message);
      return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[Nova Push] Subscribe error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
