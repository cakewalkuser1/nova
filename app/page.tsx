"use client";

import { useState } from "react";
import { Conversation } from "@/components/Conversation";
import { Nudges } from "@/components/Nudges";
import { ForYou } from "@/components/ForYou";
import { PushNotifications } from "@/components/PushNotifications";
import { SMSStatus } from "@/components/SMSStatus";
import { BottomNavigation } from "@/components/BottomNavigation";
import { GlassCard } from "@/components/GlassCard";

type Tab = "talk" | "nudges" | "settings";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("talk");

  return (
    <main className="flex flex-col min-h-screen max-w-2xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sage to-lavender flex items-center justify-center shadow-lg shadow-sage/20 animate-pulse-soft">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-textPrimary tracking-tight">
              Nova
            </h1>
            <p className="text-sm text-textMuted">
              Your calm companion. Just talk.
            </p>
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col gap-5">
        {activeTab === "talk" && (
          <>
            <GlassCard className="flex-1 min-h-[50vh] overflow-hidden" animate>
              <Conversation />
            </GlassCard>
            <ForYou />
          </>
        )}

        {activeTab === "nudges" && (
          <div className="flex flex-col gap-5">
            <Nudges />
            <ForYou />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="flex flex-col gap-5">
            <GlassCard className="p-5">
              <h2 className="text-lg font-medium text-textPrimary mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </h2>
              <p className="text-sm text-textMuted">
                Manage your notification preferences and connections.
              </p>
            </GlassCard>
            <PushNotifications />
            <SMSStatus />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        hasNudges={true}
      />
    </main>
  );
}
