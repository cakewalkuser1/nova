const RECOMMEND_PREFIX = "RECOMMEND:";
const VALID_TYPES = ["movie", "video", "music", "post"] as const;

export type RecommendationItem = {
  type: (typeof VALID_TYPES)[number];
  title: string;
  url: string | null;
};

export function parseRecommendations(reply: string): {
  cleanReply: string;
  items: RecommendationItem[];
} {
  const items: RecommendationItem[] = [];
  const lines = reply.split(/\r?\n/);
  const kept: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(RECOMMEND_PREFIX)) {
      kept.push(line);
      continue;
    }
    const rest = trimmed.slice(RECOMMEND_PREFIX.length);
    const pipeCount = (rest.match(/\|/g) || []).length;
    if (pipeCount < 2) continue;
    const firstPipe = rest.indexOf("|");
    const secondPipe = rest.indexOf("|", firstPipe + 1);
    const type = rest.slice(0, firstPipe).trim().toLowerCase();
    const title = rest.slice(firstPipe + 1, secondPipe).trim();
    let url: string | null = rest.slice(secondPipe + 1).trim();
    if (url === "" || url.toLowerCase() === "none") url = null;
    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number]) || !title)
      continue;
    items.push({
      type: type as (typeof VALID_TYPES)[number],
      title,
      url,
    });
  }

  let cleanReply = kept.join("\n").trim();
  while (cleanReply.endsWith("\n\n")) cleanReply = cleanReply.replace(/\n\n$/, "\n");
  return { cleanReply, items };
}
