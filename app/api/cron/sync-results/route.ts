import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncTournamentField, syncTournamentResults } from "@/lib/live-scores";

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
 *
 * Also auto-loads the FIELD (see syncTournamentField) for any tournament
 * starting in the next week that doesn't have one saved yet — so a normal
 * week needs zero commissioner action before picks open. Once a field
 * exists for a tournament (whether from this or a manual edit) it's left
 * alone here; re-loading it is still available any time via the "Auto-load
 * Field" button on Commissioner Tools -> Tournament Field.
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
  const weekOut = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

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

  const results = [];
  for (const t of tournaments ?? []) {
    const result = await syncTournamentResults(supabase, (t as any).id);
    results.push({ tournament: (t as any).name, ...result });
  }

  // Upcoming tournaments (today through 7 days out) that don't have a field
  // saved yet — auto-load one so the picker isn't stuck showing the whole
  // golfer pool while everyone waits on a commissioner to hand-pick it.
  const { data: upcoming } = await supabase
    .from("tournaments")
    .select("id,name,start_date")
    .gte("start_date", today)
    .lte("start_date", weekOut);

  const fieldResults = [];
  for (const t of upcoming ?? []) {
    const { count } = await supabase
      .from("tournament_field")
      .select("golfer_id", { count: "exact", head: true })
      .eq("tournament_id", (t as any).id);
    if (count && count > 0) continue;
    const result = await syncTournamentField(supabase, (t as any).id);
    fieldResults.push({ tournament: (t as any).name, ...result });
  }

  return NextResponse.json({ ran: results.length, results, fieldsLoaded: fieldResults.length, fieldResults });
}
