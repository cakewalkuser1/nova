"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";

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
      <GlassCard className="p-4" color="sage">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-sage border-2 border-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-textPrimary">SMS Enabled</h3>
            <p className="text-xs text-textMuted">
              Text Nova anytime. She'll reply just like in the app.
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden">
      <div className="px-5 py-4 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-textLight/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-textLight" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-textPrimary">SMS via Twilio</h3>
            <p className="text-xs text-textMuted">Configure to text Nova</p>
          </div>
        </div>
      </div>
      <div className="p-5">
        <p className="text-sm text-textMuted mb-4">
          To text Nova, add these environment variables and configure your Twilio webhook:
        </p>
        <div className="space-y-2 text-xs font-mono bg-textPrimary/5 rounded-xl p-4 border border-white/20">
          <div className="text-textPrimary">TWILIO_ACCOUNT_SID=your_account_sid</div>
          <div className="text-textPrimary">TWILIO_AUTH_TOKEN=your_auth_token</div>
          <div className="text-textPrimary">TWILIO_PHONE_NUMBER=+1234567890</div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-textMuted mb-2">Webhook URL:</p>
          <code className="text-xs text-textPrimary block p-3 bg-white/40 rounded-xl break-all border border-white/30">
            {webhookUrl}
          </code>
        </div>
      </div>
    </GlassCard>
  );
}
