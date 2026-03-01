"use client";

import { useState, useEffect } from "react";

export function SMSStatus() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    // Check if Twilio is configured
    const twilioConfigured = process.env.NEXT_PUBLIC_TWILIO_CONFIGURED === "true";
    setIsConfigured(twilioConfigured);

    // Build webhook URL
    const baseUrl = window.location.origin;
    setWebhookUrl(`${baseUrl}/api/twilio/webhook`);
  }, []);

  if (isConfigured) {
    return (
      <div className="rounded-xl bg-emerald-900/20 border border-emerald-800/30 p-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-medium text-emerald-200">SMS Enabled</h3>
        </div>
        <p className="text-xs text-emerald-300/70 mt-1">
          Text Nova anytime. She'll reply just like in the app.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-3">
      <h3 className="text-sm font-medium text-zinc-300">SMS via Twilio</h3>
      <p className="text-xs text-zinc-500 mt-1 mb-3">
        To text Nova, add these environment variables and configure your Twilio webhook:
      </p>
      <div className="space-y-2 text-xs font-mono bg-zinc-950 rounded-lg p-3">
        <div>TWILIO_ACCOUNT_SID=your_account_sid</div>
        <div>TWILIO_AUTH_TOKEN=your_auth_token</div>
        <div>TWILIO_PHONE_NUMBER=+1234567890</div>
      </div>
      <div className="mt-3">
        <p className="text-xs text-zinc-500">Webhook URL:</p>
        <code className="text-xs text-zinc-400 block mt-1 break-all">{webhookUrl}</code>
      </div>
    </div>
  );
}
