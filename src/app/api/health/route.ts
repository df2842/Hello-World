import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Health check, also hit daily by a Vercel cron (see vercel.json). The
 * database query keeps the free Supabase project active so it isn't
 * auto-paused after a week without traffic.
 */
export async function GET() {
  const supabase = await createClient();
  const { count, error } = await supabase.from("images").select("id", { count: "exact", head: true });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  }
  return NextResponse.json(
    { ok: true, images: count ?? 0, checkedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
