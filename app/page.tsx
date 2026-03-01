"use client";

import { Conversation } from "@/components/Conversation";
import { Nudges } from "@/components/Nudges";
import { ForYou } from "@/components/ForYou";
import { PushNotifications } from "@/components/PushNotifications";
import { SMSStatus } from "@/components/SMSStatus";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen max-w-2xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-medium text-zinc-100 tracking-tight">
          Nova
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Your calm companion. Just talk.
        </p>
      </header>
      <div className="flex-1 flex flex-col gap-6">
        <Conversation />
        <Nudges />
        <ForYou />
        <PushNotifications />
        <SMSStatus />
      </div>
    </main>
  );
}
