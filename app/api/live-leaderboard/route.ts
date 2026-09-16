import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { findEspnEventId, getEspnLeaderboard, matchGolferToLive } from "@/lib/live-scores";

export const dynamic = "force-dynamic";

/**
 * GET /api/live-leaderboard?tournamentId=...
 *
 * Live position/score/thru for every golfer in a tournament, cross-referenced
 * with our own golfers (for photos) and this week's One & Done picks (for
 * "picked by"). Returns { live: false } rather than an error whenever ESPN's
 * data isn't available (tournament not found there, not started, etc.) so
 * the UI can show a plain "not live yet" message instead of breaking.
 */
export async function GET(req: NextRequest) {
  const tournamentId = req.nextUrl.searchParams.get("tournamentId");
  if (!tournamentId || !isSupabaseConfigured) {
    return NextResponse.json({ live: false, entries: [] });
  }

  try {
    const supabase = createClient();
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .maybeSingle();
    if (!tournament) return NextResponse.json({ live: false, entries: [] });

    const espnEventId = await findEspnEventId(tournament as any);
    if (!espnEventId) return NextResponse.json({ live: false, entries: [] });

    const liveEntries = await getEspnLeaderboard(espnEventId);
    if (liveEntries.length === 0) {
      return NextResponse.json({ live: false, entries: [], espnEventId });
    }

    const [{ data: golfers }, { data: picks }] = await Promise.all([
      supabase.from("golfers").select("id,name,headshot_url").eq("active", true),
      supabase
        .from("one_and_done_picks")
        .select("golfer_id, profiles(display_name)")
        .eq("tournament_id", tournamentId),
    ]);

    const pickersByGolferId = new Map<string, string[]>();
    for (const p of picks ?? []) {
      const list = pickersByGolferId.get((p as any).golfer_id) ?? [];
      list.push((p as any).profiles?.display_name ?? "Unknown");
      pickersByGolferId.set((p as any).golfer_id, list);
    }

    const entries = (golfers ?? [])
      .map((g: any) => {
        const live = matchGolferToLive(g.name, liveEntries);
        if (!live) return null;
        return {
          golferId: g.id,
          name: g.name,
          headshotUrl: g.headshot_url,
          espnId: live.espnId,
          position: live.position,
          score: live.score,
          thru: live.thru,
          status: live.status,
          teeTime: live.teeTime,
          pickedBy: pickersByGolferId.get(g.id) ?? [],
        };
      })
      .filter(Boolean);

    return NextResponse.json({ live: true, entries, espnEventId });
  } catch {
    return NextResponse.json({ live: false, entries: [] });
  }
}
