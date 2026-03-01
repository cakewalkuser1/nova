"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { VoiceInput } from "./VoiceInput";
import { getSupabaseClient } from "@/docs/lib/supabase";

export interface Message {
  id: string;
  role: "user" | "nova";
  content: string;
  isCheckIn?: boolean;
  reminderCreated?: boolean;
  type?: "reminder" | "nudge" | "check-in" | "system" | "reply";
  read?: boolean;
  sourceReminderId?: string;
  completed?: boolean;
}

const DEFAULT_USER_ID = "anon-mvp";

// Sound effect for new Nova messages
const playNovaSound = () => {
  try {
    const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Ignore audio errors
  }
};

export function Conversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [typingDots, setTypingDots] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef<ReturnType<typeof getSupabaseClient> | null>(null);
  const audioEnabledRef = useRef(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Typing indicator animation
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setTypingDots((d) => (d + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Enable audio on first user interaction
  const enableAudio = useCallback(() => {
    audioEnabledRef.current = true;
  }, []);

  // Fetch conversation history and subscribe to realtime
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabaseRef.current = supabase;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/conversation?userId=${DEFAULT_USER_ID}&limit=50`);
        const data = await res.json();
        if (data.messages) {
          const history: Message[] = data.messages.map((m: { id: string; role: "user" | "nova"; content: string; type?: string; isCheckIn?: boolean; read?: boolean; timestamp?: string; source_reminder_id?: string; completed?: boolean }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            type: m.type as Message["type"],
            isCheckIn: m.isCheckIn,
            read: m.read ?? true,
            sourceReminderId: m.source_reminder_id,
            completed: m.completed ?? false,
          }));
          setMessages(history);
        }
      } catch (e) {
        console.error("Failed to fetch conversation:", e);
      }
    };

    fetchHistory();

    // Subscribe to realtime nova_messages
    const channel = supabase
      .channel("nova_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "nova_messages",
          filter: `user_id=eq.${DEFAULT_USER_ID}`,
        },
        (payload) => {
          const newMsg = payload.new as { id: string; content: string; type: string; created_at: string; source_reminder_id?: string };
          const novaMsg: Message = {
            id: newMsg.id,
            role: "nova",
            content: newMsg.content,
            type: newMsg.type as Message["type"],
            isCheckIn: newMsg.type === "check-in",
            read: false,
            sourceReminderId: newMsg.source_reminder_id,
          };
          setMessages((prev) => [...prev, novaMsg]);
          if (audioEnabledRef.current) {
            playNovaSound();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Mark nova_messages as read when they're rendered
  useEffect(() => {
    const unreadNova = messages.filter((m) => m.role === "nova" && !m.read && m.id);
    if (unreadNova.length === 0) return;

    const markRead = async () => {
      const ids = unreadNova.map((m) => m.id);
      await supabaseRef.current
        ?.from("nova_messages")
        .update({ read: true })
        .in("id", ids);
    };

    markRead();
  }, [messages]);

  const send = async (text: string) => {
    enableAudio();
    const t = text.trim();
    if (!t || isLoading) return;
    setInput("");
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: t };
    setMessages((m) => [...m, userMsg]);
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t, userId: DEFAULT_USER_ID }),
      });
      const data = await res.json();
      const reply: Message = {
        id: crypto.randomUUID(),
        role: "nova",
        content: data.reply ?? "I'm here when you need me.",
        isCheckIn: data.isCheckIn === true,
        reminderCreated: data.reminderCreated === true,
        type: "reply",
      };
      setMessages((m) => [...m, reply]);
      if (audioEnabledRef.current) {
        playNovaSound();
      }
    } catch {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "nova", content: "Something went wrong. Try again when you're ready." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  // Mark reminder as done
  const markDone = async (messageId: string, reminderId?: string) => {
    if (!reminderId) return;
    try {
      const res = await fetch("/api/reminders/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderId }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId || m.sourceReminderId === reminderId
              ? { ...m, completed: true }
              : m
          )
        );
      }
    } catch (e) {
      console.error("Failed to mark done:", e);
    }
  };

  // Get message style based on type
  const getMessageStyle = (m: Message) => {
    if (m.role === "user") {
      return "bg-zinc-700 text-zinc-100";
    }
    if (m.completed) {
      return "bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 line-through";
    }
    if (m.type === "reminder" || m.reminderCreated) {
      return "bg-emerald-900/30 text-emerald-100 border border-emerald-800/30";
    }
    if (m.type === "nudge") {
      return "bg-blue-900/30 text-blue-100 border border-blue-800/30";
    }
    if (m.isCheckIn || m.type === "check-in") {
      return "bg-amber-950/40 text-amber-200/90 border border-amber-800/30";
    }
    return "bg-zinc-800 text-zinc-200";
  };

  return (
    <section className="flex flex-col flex-1 min-h-0 rounded-xl bg-zinc-900/50 border border-zinc-800">
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[50vh]"
        onClick={enableAudio}
      >
        {messages.length === 0 && (
          <p className="text-zinc-500 text-sm">
            Say something or tap the mic. No setup — just talk.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${getMessageStyle(m)} ${m.role === "nova" ? "group relative" : ""}`}
            >
              {m.type === "reminder" && !m.completed && (
                <span className="block text-xs text-emerald-400/80 mb-1">Reminder</span>
              )}
              {m.type === "reminder" && m.completed && (
                <span className="block text-xs text-zinc-500 mb-1">Done</span>
              )}
              {m.type === "nudge" && (
                <span className="block text-xs text-blue-400/80 mb-1">Nudge</span>
              )}
              {m.isCheckIn && (
                <span className="block text-xs text-amber-400/80 mb-1">Check-in</span>
              )}
              <span className={m.completed ? "line-through opacity-60" : ""}>{m.content}</span>
              {m.reminderCreated && (
                <span className="block mt-1 text-xs text-emerald-400/80">
                  Reminder set.
                </span>
              )}
              {/* Mark Done button for reminders */}
              {m.role === "nova" && (m.type === "reminder" || m.sourceReminderId) && !m.completed && (
                <button
                  onClick={() => markDone(m.id, m.sourceReminderId)}
                  className="mt-2 px-3 py-1 rounded-lg bg-emerald-800/50 hover:bg-emerald-700/50 text-emerald-200 text-xs transition-colors"
                >
                  Mark done
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-zinc-800 text-zinc-500 text-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800 flex gap-2 items-center">
        <VoiceInput onTranscript={send} disabled={isLoading} />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or use voice…"
          className="flex-1 bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2.5 rounded-xl bg-zinc-700 text-zinc-100 text-sm font-medium hover:bg-zinc-600 disabled:opacity-50 disabled:pointer-events-none"
        >
          Send
        </button>
      </form>
    </section>
  );
}
