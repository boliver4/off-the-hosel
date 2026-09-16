import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  findEspnEventId,
  getEspnLeaderboard,
  getEspnScorecard,
  matchGolferToLive,
  tallyHoleStats,
} from "@/lib/live-scores";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 8;

/**
 * POST /api/sync-results  { tournamentId }
 *
 * Bulk version of the single-golfer "Auto-fill from live scoring" button —
 * pulls live winnings/finish/made-cut/hole-by-hole for EVERY golfer in the
 * tournament's field at once and saves them all in one go, so a
 * commissioner doesn't have to click through each golfer one by one every
 * week. Only golfers ESPN actually has live data for get written — anyone
 * it can't find is left alone (not zeroed out) so the commissioner can
 * still enter them by hand. Requires admin (enforced by RLS on the write).
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 });
  }

  let tournamentId: string | undefined;
  try {
    const body = await req.json();
    tournamentId = body?.tournamentId;
  } catch {
    // ignore
  }
  if (!tournamentId) {
    return NextResponse.json({ error: "Missing tournamentId" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .maybeSingle();
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const espnEventId = await findEspnEventId(tournament as any);
  if (!espnEventId) {
    return NextResponse.json({ synced: 0, skipped: 0, total: 0, reason: "no_live_event" });
  }

  const liveEntries = await getEspnLeaderboard(espnEventId);
  if (liveEntries.length === 0) {
    return NextResponse.json({ synced: 0, skipped: 0, total: 0, reason: "no_live_data" });
  }

  // Field golfers if the commissioner set one for this week, else every
  // active golfer — same fallback the One & Done picker uses.
  const { data: fieldRows } = await supabase
    .from("tournament_field")
    .select("golfers(id,name)")
    .eq("tournament_id", tournamentId);
  let golfers: { id: string; name: string }[] = (fieldRows ?? [])
    .map((r: any) => r.golfers)
    .filter(Boolean);
  if (golfers.length === 0) {
    const { data: allGolfers } = await supabase.from("golfers").select("id,name").eq("active", true);
    golfers = allGolfers ?? [];
  }

  const rows: any[] = [];
  let skipped = 0;

  for (let i = 0; i < golfers.length; i += BATCH_SIZE) {
    const batch = golfers.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (g) => {
        const match = matchGolferToLive(g.name, liveEntries);
        if (!match) return null;
        const rounds = await getEspnScorecard(espnEventId, match.espnId);
        const tally = tallyHoleStats(rounds);
        return {
          tournament_id: tournamentId,
          golfer_id: g.id,
          winnings: match.earnings ?? 0,
          made_cut: match.madeCut ?? true,
          finish_position: match.position,
          ...tally,
        };
      })
    );
    for (const r of results) {
      if (r) rows.push(r);
      else skipped++;
    }
  }

  if (rows.length > 0) {
    const { error } = await (supabase.from("tournament_results") as any).upsert(rows, {
      onConflict: "tournament_id,golfer_id",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ synced: rows.length, skipped, total: golfers.length });
}
