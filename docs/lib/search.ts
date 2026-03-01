export type SearchResult = {
  title: string;
  url: string;
  content?: string;
};

export type SearchOptions = {
  maxResults?: number;
  topic?: "general" | "news";
};

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

export async function searchWeb(
  query: string,
  options?: SearchOptions
): Promise<{ results: SearchResult[]; error?: string }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return { results: [], error: "Search is not configured." };
  }

  try {
    const res = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: query.trim().slice(0, 500),
        max_results: Math.min(20, Math.max(1, options?.maxResults ?? 5)),
        search_depth: "basic",
        topic: options?.topic ?? "general",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Nova Search] Tavily error:", res.status, errText);
      return { results: [], error: "Search failed. Try again." };
    }

    const data = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
      answer?: string;
    };
    const raw = data.results ?? [];
    const results: SearchResult[] = raw.map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      content: r.content,
    }));
    return { results };
  } catch (e) {
    console.error("[Nova Search] Error:", e);
    return { results: [], error: "Search failed. Try again." };
  }
}

/** Format search results as a short string for the LLM (tool result). */
export function formatSearchResultForModel(
  payload: { results: SearchResult[]; error?: string }
): string {
  if (payload.error) return payload.error;
  if (!payload.results.length) return "No results found.";
  const lines = payload.results.slice(0, 5).map((r) => {
    const content = r.content ? ` ${r.content.slice(0, 300)}` : "";
    return `Title: ${r.title}\nURL: ${r.url}${content}`;
  });
  return lines.join("\n\n");
}
