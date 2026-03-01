import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/docs/lib/supabase";

export const dynamic = "force-dynamic";

const DEFAULT_USER = "anon-mvp";
const MAX_ITEMS = 20;

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? DEFAULT_USER;
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("recommendations")
    .select("id, type, title, url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_ITEMS);

  if (error) {
    console.error("[Nova] Recommendations fetch failed:", error.message);
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const items = (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url ?? undefined,
    type: r.type,
  }));

  return NextResponse.json({ items });
}
