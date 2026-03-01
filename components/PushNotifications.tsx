"use client";

import { useState, useEffect, useCallback } from "react";

const DEFAULT_USER_ID = "anon-mvp";

// Convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes.buffer;
}

export function PushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if push is supported
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      setIsSubscribed(false);
    }
  };

  const subscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from env
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("VAPID public key not configured");
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send to server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEFAULT_USER_ID,
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!))),
              auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!))),
            },
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to subscribe");
      setIsSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
      setIsSubscribed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to unsubscribe");
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-300">Push Notifications</h3>
          <p className="text-xs text-zinc-500">
            {isSubscribed ? "You'll get reminders even when closed" : "Enable to get reminders anywhere"}
          </p>
        </div>
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={loading}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isSubscribed
              ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
              : "bg-emerald-800/50 text-emerald-200 hover:bg-emerald-700/50"
          } disabled:opacity-50`}
        >
          {loading ? "..." : isSubscribed ? "Disable" : "Enable"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
