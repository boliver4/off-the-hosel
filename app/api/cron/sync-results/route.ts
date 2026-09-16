import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncTournamentResults } from "@/lib/live-scores";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/sync-results
 *
 * The fully-automatic version of "Sync All From Live Scoring" — no
 * commissioner has to click anything. Meant to be called on a timer (see
 * .github/workflows/sync-results.yml) rather than by a person, so it's
 * locked behind a shared secret instead of a logged-in admin session:
 * requires header  Authorization: Bearer <CRON_SECRET>  matching the
 * CRON_SECRET environment variable. Finds every tournament whose date
 * range covers today (or ended within the last day, to catch final
 * results once a tournament wraps) and syncs each one.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Tournaments in progress today, or that just finished yesterday (so the
  // last round's results still get swept up automatically).
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("id,name,start_date,end_date")
    .lte("start_date", today)
    .gte("end_date", yesterday);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!tournaments || tournaments.length === 0) {
    return NextResponse.json({ ran: 0, results: [] });
  }

  const results = [];
  for (const t of tournaments) {
    const result = await syncTournamentResults(supabase, (t as any).id);
    results.push({ tournament: (t as any).name, ...result });
  }

  return NextResponse.json({ ran: results.length, results });
}
