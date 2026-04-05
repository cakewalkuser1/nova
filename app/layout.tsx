"use client";

import "./globals.css";
import { useEffect } from "react";
import { GradientBackground } from "@/components/GradientBackground";

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
        <title>Nova — Your Calm Companion</title>
        <meta name="description" content="A calm, voice-first companion that remembers and supports you." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#F0F4F1" />
        {/* Inter font from Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen font-sans text-textPrimary overflow-x-hidden">
        {/* Animated gradient background */}
        <GradientBackground />
        
        {/* Main content */}
        {children}
      </body>
    </html>
  );
}
