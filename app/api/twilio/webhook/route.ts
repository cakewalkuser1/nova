import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/docs/lib/supabase";
import { logObservation } from "@/docs/lib/observationLogger";
import twilio from "twilio";

export const dynamic = "force-dynamic";

// Twilio credentials
const twilioSid = process.env.TWILIO_ACCOUNT_SID || "";
const twilioToken = process.env.TWILIO_AUTH_TOKEN || "";
const twilioPhone = process.env.TWILIO_PHONE_NUMBER || "";

const twilioClient = twilioSid && twilioToken ? twilio(twilioSid, twilioToken) : null;

// Map phone numbers to user IDs (in production, this would be a lookup table)
const phoneToUserId: Record<string, string> = {};

export async function POST(req: NextRequest) {
  try {
    // Verify Twilio signature in production
    const formData = await req.formData();
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;

    if (!from || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get or create user ID for this phone number
    let userId = phoneToUserId[from];
    if (!userId) {
      // Create a user ID based on phone hash (simplified for MVP)
      userId = `phone-${from.replace(/\D/g, "").slice(-10)}`;
      phoneToUserId[from] = userId;
    }

    const client = getSupabaseClient();

    // Store the incoming SMS
    await client.from("sms_messages").insert({
      user_id: userId,
      phone_number: from,
      direction: "inbound",
      content: body,
      twilio_sid: messageSid,
    });

    // Log observation
    await logObservation({
      user_id: userId,
      raw_input: body,
      parsed_intent: "sms_inbound",
    });

    // Call the chat API to get Nova's response
    const chatRes = await fetch(`${process.env.VERCEL_URL || "http://localhost:3000"}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: body, userId }),
    });

    const chatData = await chatRes.json();
    const reply = chatData.reply || "I'm here when you need me.";

    // Store the outgoing SMS
    await client.from("sms_messages").insert({
      user_id: userId,
      phone_number: from,
      direction: "outbound",
      content: reply,
    });

    // Send SMS reply via Twilio
    if (twilioClient && twilioPhone) {
      await twilioClient.messages.create({
        body: reply,
        from: twilioPhone,
        to: from,
      });
    }

    // Return TwiML response (empty, since we already sent the message)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`,
      {
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (e) {
    console.error("[Twilio Webhook] Error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
