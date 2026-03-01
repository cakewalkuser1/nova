"use client";

import { useState, useEffect } from "react";

const DEFAULT_USER_ID = "anon-mvp";

interface Habit {
  id: string;
  description: string;
  confidence_score: number;
  last_observed: string;
}

export function Nudges() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/habits?userId=${DEFAULT_USER_ID}`)
      .then((r) => r.json())
      .then((d) => setHabits(Array.isArray(d.habits) ? d.habits : []))
      .catch(() => setHabits([]));
  }, []);

  if (habits.length === 0) return null;

  return (
    <section className="rounded-xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-left text-sm text-zinc-400 hover:bg-zinc-800/50"
      >
        <span>Nudges from what you do</span>
        <span className="text-zinc-500">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ul className="px-4 pb-4 space-y-2">
          {habits.map((h) => (
            <li
              key={h.id}
              className="text-sm text-zinc-300 py-1.5 border-b border-zinc-800/50 last:border-0"
            >
              {h.description}
              <span className="ml-2 text-zinc-500 text-xs">
                {Math.round(h.confidence_score * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
