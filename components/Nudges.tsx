"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";

const DEFAULT_USER_ID = "anon-mvp";

interface Habit {
  id: string;
  description: string;
  confidence_score: number;
  last_observed: string;
}

export function Nudges() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    fetch(`/api/habits?userId=${DEFAULT_USER_ID}`)
      .then((r) => r.json())
      .then((d) => setHabits(Array.isArray(d.habits) ? d.habits : []))
      .catch(() => setHabits([]));
  }, []);

  if (habits.length === 0) {
    return (
      <GlassCard className="p-5">
        <div className="text-center text-textMuted">
          <p className="text-sm">No habits detected yet.</p>
          <p className="text-xs mt-1 text-textLight">
            Keep chatting with Nova — she'll learn your patterns.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden" color="lavender">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-lavender/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-lavender" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-medium text-textPrimary">Nudges</span>
            <p className="text-xs text-textMuted">From what Nova has learned</p>
          </div>
        </div>
        <span className={`text-textLight transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <ul className="px-5 pb-4 space-y-2">
          {habits.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between py-2.5 border-b border-lavender/10 last:border-0"
            >
              <span className="text-sm text-textPrimary">{h.description}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full bg-lavender/20 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-lavender transition-all duration-500"
                    style={{ width: `${Math.round(h.confidence_score * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-textLight w-8 text-right">
                  {Math.round(h.confidence_score * 100)}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
