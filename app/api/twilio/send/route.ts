import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/docs/lib/supabase";
import twilio from "twilio";

export const dynamic = "force-dynamic";

const twilioSid = process.env.TWILIO_ACCOUNT_SID || "";
const twilioToken = process.env.TWILIO_AUTH_TOKEN || "";
const twilioPhone = process.env.TWILIO_PHONE_NUMBER || "";

const twilioClient = twilioSid && twilioToken ? twilio(twilioSid, twilioToken) : null;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumber, message, userId } = body;

    if (!phoneNumber || !message) {
      return NextResponse.json({ error: "Missing phoneNumber or message" }, { status: 400 });
    }

    if (!twilioClient || !twilioPhone) {
      return NextResponse.json({ error: "Twilio not configured" }, { status: 500 });
    }

    // Send SMS
    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: twilioPhone,
      to: phoneNumber,
    });

    // Store in database
    const client = getSupabaseClient();
    await client.from("sms_messages").insert({
      user_id: userId || "unknown",
      phone_number: phoneNumber,
      direction: "outbound",
      content: message,
      twilio_sid: twilioMessage.sid,
    });

    return NextResponse.json({ success: true, sid: twilioMessage.sid });
  } catch (e) {
    console.error("[Twilio Send] Error:", e);
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
  }
}
