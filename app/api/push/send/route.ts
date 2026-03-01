import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/docs/lib/supabase";
import webpush from "web-push";

export const dynamic = "force-dynamic";

// Configure web-push with VAPID keys (set in env)
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:nova@example.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function POST(req: NextRequest) {
  try {
    // Only allow internal/cron calls (no external access)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, title, body: messageBody, type, data } = body;

    if (!userId || !title || !messageBody) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // Get user's push subscriptions
    const { data: subscriptions, error } = await client
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, error: "No subscriptions" });
    }

    const payload = JSON.stringify({
      title,
      body: messageBody,
      type,
      tag: `nova-${type || "message"}`,
      data: data || {},
      actions: type === "reminder" ? [{ action: "open", title: "View" }] : [],
    });

    let sent = 0;
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      })
    );

    // Clean up failed subscriptions (expired/invalid)
    const failedEndpoints = results
      .map((r, i) => ({ result: r, endpoint: subscriptions[i].endpoint }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ endpoint }) => endpoint);

    if (failedEndpoints.length > 0) {
      await client.from("push_subscriptions").delete().in("endpoint", failedEndpoints);
      console.log("[Nova Push] Cleaned up", failedEndpoints.length, "expired subscriptions");
    }

    return NextResponse.json({ sent, total: subscriptions.length });
  } catch (e) {
    console.error("[Nova Push] Send error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
