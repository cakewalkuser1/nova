import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/docs/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") ?? "anon-mvp";
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("habits")
      .select("id, description, confidence_score, last_observed")
      .eq("user_id", userId)
      .order("last_observed", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ habits: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ habits: [] });
  }
}
