import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  findEspnEventId,
  getEspnLeaderboard,
  getEspnScorecard,
  matchGolferToLive,
  tallyHoleStats,
} from "@/lib/live-scores";
import { EMPTY_HOLE_TALLY } from "@/lib/scoring";

export const dynamic = "force-dynamic";

/**
 * GET /api/hole-tally?tournamentId=...&golferId=...
 *
 * Auto-fills a commissioner's result entry: pars/birdies/eagles/bogeys/etc.
 * tallied from live hole-by-hole data, so they don't have to count holes by
 * hand. Always best-effort — returns all-zero tallies (never an error) when
 * ESPN's data isn't available, since the commissioner can just type numbers
 * in by hand in that case.
 */
export async function GET(req: NextRequest) {
  const tournamentId = req.nextUrl.searchParams.get("tournamentId");
  const golferId = req.nextUrl.searchParams.get("golferId");
  if (!tournamentId || !golferId || !isSupabaseConfigured) {
    return NextResponse.json({ found: false, tally: EMPTY_HOLE_TALLY, roundsFound: 0 });
  }

  try {
    const supabase = createClient();
    const [{ data: tournament }, { data: golfer }] = await Promise.all([
      supabase.from("tournaments").select("*").eq("id", tournamentId).maybeSingle(),
      supabase.from("golfers").select("*").eq("id", golferId).maybeSingle(),
    ]);
    if (!tournament || !golfer) {
      return NextResponse.json({ found: false, tally: EMPTY_HOLE_TALLY, roundsFound: 0 });
    }

    const espnEventId = await findEspnEventId(tournament as any);
    if (!espnEventId) {
      return NextResponse.json({ found: false, tally: EMPTY_HOLE_TALLY, roundsFound: 0 });
    }

    const liveEntries = await getEspnLeaderboard(espnEventId);
    const match = matchGolferToLive((golfer as any).name, liveEntries);
    if (!match) {
      return NextResponse.json({ found: false, tally: EMPTY_HOLE_TALLY, roundsFound: 0 });
    }

    const rounds = await getEspnScorecard(espnEventId, match.espnId);
    const tally = tallyHoleStats(rounds);

    return NextResponse.json({ found: rounds.length > 0, tally, roundsFound: rounds.length });
  } catch {
    return NextResponse.json({ found: false, tally: EMPTY_HOLE_TALLY, roundsFound: 0 });
  }
}
