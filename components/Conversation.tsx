"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { VoiceInput } from "./VoiceInput";
import { getSupabaseClient } from "@/docs/lib/supabase";
import { MessageCard } from "./GlassCard";

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

// Calming sound effect for new Nova messages
const playNovaSound = () => {
  try {
    const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    // Softer, more calming tone
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Ignore audio errors
  }
};

export function Conversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef<ReturnType<typeof getSupabaseClient> | null>(null);
  const audioEnabledRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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

  // Get message type for styling
  const getMessageType = (m: Message): "user" | "nova" | "reminder" | "nudge" | "checkin" => {
    if (m.role === "user") return "user";
    if (m.type === "reminder" || m.reminderCreated) return "reminder";
    if (m.type === "nudge") return "nudge";
    if (m.isCheckIn || m.type === "check-in") return "checkin";
    return "nova";
  };

  // Get label text based on message type
  const getMessageLabel = (m: Message) => {
    if (m.type === "reminder" && !m.completed) return "Reminder";
    if (m.type === "reminder" && m.completed) return "Done";
    if (m.type === "nudge") return "Nudge";
    if (m.isCheckIn || m.type === "check-in") return "Check-in";
    return null;
  };

  // Get label color based on type
  const getLabelColor = (m: Message) => {
    if (m.type === "reminder" && !m.completed) return "text-sage";
    if (m.type === "reminder" && m.completed) return "text-textMuted";
    if (m.type === "nudge") return "text-lavender";
    if (m.isCheckIn || m.type === "check-in") return "text-rose";
    return "text-textMuted";
  };

  return (
    <section className="flex flex-col flex-1 min-h-0">
      {/* Messages Area */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[50vh]"
        onClick={enableAudio}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-textMuted">
            <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center mb-4 animate-pulse-soft">
              <svg className="w-8 h-8 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <p className="text-sm text-center">
              Say something or tap the mic.<br />
              <span className="text-textLight">No setup — just talk.</span>
            </p>
          </div>
        )}
        {messages.map((m, index) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={`max-w-[85%] ${m.role === "nova" ? "group relative" : ""}`}>
              <MessageCard type={getMessageType(m)}>
                {/* Type Label */}
                {getMessageLabel(m) && (
                  <span className={`block text-xs font-medium mb-1.5 ${getLabelColor(m)}`}>
                    {getMessageLabel(m)}
                  </span>
                )}
                
                {/* Message Content */}
                <span className={`block text-sm text-textPrimary leading-relaxed ${m.completed ? "line-through opacity-60" : ""}`}>
                  {m.content}
                </span>
                
                {/* Reminder Created Indicator */}
                {m.reminderCreated && (
                  <span className="block mt-2 text-xs text-sage font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Reminder set
                  </span>
                )}
                
                {/* Mark Done Button for Reminders */}
                {m.role === "nova" && (m.type === "reminder" || m.sourceReminderId) && !m.completed && (
                  <button
                    onClick={() => markDone(m.id, m.sourceReminderId)}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-sage/20 hover:bg-sage/30 text-sage text-xs font-medium transition-all duration-200 flex items-center gap-1.5 group/btn"
                  >
                    <svg className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Mark done
                  </button>
                )}
              </MessageCard>
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <MessageCard type="nova">
              <div className="flex items-center gap-2 py-1">
                <span className="w-2 h-2 rounded-full bg-lavender animate-wave" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-lavender animate-wave" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-lavender animate-wave" style={{ animationDelay: "300ms" }} />
              </div>
            </MessageCard>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 flex gap-3 items-center">
        <VoiceInput onTranscript={send} disabled={isLoading} />
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or use voice..."
            className="w-full bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl px-5 py-3.5 text-sm text-textPrimary placeholder-textLight focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 transition-all duration-200"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-5 py-3.5 rounded-2xl bg-sage text-white text-sm font-medium hover:bg-sage-dark active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 shadow-lg shadow-sage/20"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </section>
  );
}
