"use client";

import "./globals.css";
import { useEffect } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Register service worker for push notifications
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("[Nova SW] Registered:", registration.scope);
        })
        .catch((error) => {
          console.error("[Nova SW] Registration failed:", error);
        });
    }
  }, []);

  return (
    <html lang="en" className="antialiased">
      <head>
        <title>Nova — AI Life Companion</title>
        <meta name="description" content="A calm, voice-first companion that remembers and supports you." />
      </head>
      <body className="min-h-screen bg-surface text-zinc-200 font-sans">
        {children}
      </body>
    </html>
  );
}
