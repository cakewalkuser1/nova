"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";

interface Recommendation {
  id: string;
  title: string;
  url?: string;
}

export function ForYou() {
  const [items, setItems] = useState<Recommendation[]>([]);

  useEffect(() => {
    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.items) ? d.items : []))
      .catch(() => setItems([]));
  }, []);

  return (
    <GlassCard className="overflow-hidden">
      <div className="px-5 py-4 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-rose/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-medium text-textPrimary">For You</h2>
            <p className="text-xs text-textMuted">Personalized suggestions</p>
          </div>
        </div>
      </div>
      <div className="p-5">
        {items.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-rose/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <p className="text-sm text-textMuted">
              Recommendations will appear here as Nova learns what you like.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.id}>
                {i.url ? (
                  <a
                    href={i.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/40 hover:bg-white/60 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    <span className="text-sm text-textPrimary group-hover:text-sage transition-colors">
                      {i.title}
                    </span>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40">
                    <div className="w-8 h-8 rounded-lg bg-rose/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-sm text-textPrimary">{i.title}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlassCard>
  );
}
