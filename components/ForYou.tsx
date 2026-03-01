"use client";

import { useState, useEffect } from "react";

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
    <section className="rounded-xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
      <h2 className="px-4 py-3 text-sm font-medium text-zinc-400 border-b border-zinc-800">
        For you
      </h2>
      <div className="px-4 py-3">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Recommendations will appear here as Nova learns what you like.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="text-sm">
                {i.url ? (
                  <a
                    href={i.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-300 hover:text-zinc-100 underline"
                  >
                    {i.title}
                  </a>
                ) : (
                  <span className="text-zinc-300">{i.title}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
