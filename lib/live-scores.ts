// Live tournament data for Off The Hosel.
//
// Off The Hosel doesn't have a paid sports-data subscription, so this pulls
// from ESPN's public golf endpoints — the same data ESPN's own site/app use.
// These endpoints aren't officially documented or supported by ESPN, so
// every function here is defensive: if ESPN changes a field name, goes
// down, or a tournament simply isn't live-trackable, callers get an empty
// result instead of a crash. Nothing here ever affects official scoring —
// real fantasy points still only come from tournament_results, entered by
// hand by a commissioner after a tournament wraps. This is purely "how's my
// guy doing right now" context while a tournament is in progress.

const ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard";
const ESPN_LEADERBOARD = "https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard";
const ESPN_PLAYER_SUMMARY = "https://site.web.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard";

export type LiveLeaderboardEntry = {
  espnId: string;
  name: string;
  position: string | null;
  score: string | null;
  thru: string | null;
  teeTime: string | null;
  status: string | null; // e.g. "CUT", "WD", "F" (finished)
  earnings: number | null;
  madeCut: boolean | null; // null = unknown/not yet determined (tournament in progress)
};

export type LiveScorecardHole = {
  hole: number;
  par: number | null;
  score: number | null;
};

export type LiveScorecardRound = {
  round: number;
  holes: LiveScorecardHole[];
  total: number | null;
};

function toDateStamp(d: string): string {
  return d.replaceAll("-", "");
}

/**
 * Finds the ESPN event id for a tournament by matching it against ESPN's
 * scoreboard for that week (padded by a day on each side, since ESPN's
 * calendar can list a tournament starting/ending a day off from ours).
 * Returns null if nothing plausible is found — callers should treat that
 * as "no live data available" rather than an error.
 */
export async function findEspnEventId(tournament: {
  name: string;
  start_date: string;
  end_date: string;
}): Promise<string | null> {
  try {
    const start = new Date(tournament.start_date + "T00:00:00");
    const end = new Date(tournament.end_date + "T00:00:00");
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() + 1);
    const range = `${toDateStamp(start.toISOString().slice(0, 10))}-${toDateStamp(
      end.toISOString().slice(0, 10)
    )}`;

    const res = await fetch(`${ESPN_SCOREBOARD}?dates=${range}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const events: any[] = data?.events ?? [];
    if (events.length === 0) return null;
    if (events.length === 1) return events[0].id ?? null;

    // Multiple events that week (rare) — pick the closest name match.
    const target = normalizeName(tournament.name);
    let best = events[0];
    let bestScore = -1;
    for (const ev of events) {
      const score = similarity(normalizeName(ev.name ?? ""), target);
      if (score > bestScore) {
        bestScore = score;
        best = ev;
      }
    }
    return best?.id ?? null;
  } catch {
    return null;
  }
}

/** Live leaderboard (position/score/thru) for an ESPN event, unmatched to our golfers yet. */
export async function getEspnLeaderboard(espnEventId: string): Promise<LiveLeaderboardEntry[]> {
  try {
    const res = await fetch(`${ESPN_LEADERBOARD}?event=${espnEventId}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();

    const competitors: any[] =
      data?.events?.[0]?.competitions?.[0]?.competitors ??
      data?.events?.[0]?.competitors ??
      data?.competitors ??
      [];

    return competitors
      .map((c: any): LiveLeaderboardEntry | null => {
        const name = c.athlete?.displayName ?? c.displayName ?? c.athlete?.fullName ?? null;
        if (!name) return null;
        const position: string | null = c.position?.displayName ?? c.status?.position?.displayName ?? null;
        const statusName: string = (c.status?.type?.name ?? "").toUpperCase();
        const statusDesc: string = (c.status?.type?.description ?? c.status?.detail ?? "").toUpperCase();
        const isFinished = statusName === "STATUS_FINISH" || statusName === "STATUS_CUT" || statusDesc.includes("FINISH") || statusDesc.includes("CUT");
        const isCut =
          (position ?? "").toUpperCase() === "CUT" ||
          statusName.includes("CUT") ||
          statusDesc.includes("CUT") ||
          statusDesc.includes("MISSED");
        // House rule: a golfer who withdraws, is disqualified, or otherwise
        // doesn't complete a round is treated the same as missing the cut
        // (the commissioner-set missed-cut penalty applies) — not left as
        // "made the cut" just because ESPN never marks them CUT or FINISH.
        const isWithdrawn =
          (position ?? "").toUpperCase() === "WD" ||
          (position ?? "").toUpperCase() === "DQ" ||
          statusName.includes("WITHDR") ||
          statusName.includes("DISQUAL") ||
          statusDesc.includes("WITHDR") ||
          statusDesc.includes("DISQUAL") ||
          statusDesc.includes(" WD") ||
          statusDesc === "WD";
        return {
          espnId: String(c.id ?? c.athlete?.id ?? ""),
          name,
          position,
          score:
            (typeof c.score === "string" ? c.score : c.score?.displayValue) ??
            c.status?.score ??
            null,
          thru: c.status?.thru ?? (typeof c.status?.detail === "string" ? c.status.detail : null),
          teeTime: c.status?.teeTime ?? null,
          status: c.status?.type?.description ?? c.status?.detail ?? null,
          earnings: typeof c.earnings === "number" ? c.earnings : null,
          madeCut: isCut || isWithdrawn ? false : isFinished ? true : null,
        };
      })
      .filter((e): e is LiveLeaderboardEntry => !!e);
  } catch {
    return [];
  }
}

/** Hole-by-hole scorecard for one player in one event, round by round. Best-effort. */
export async function getEspnScorecard(
  espnEventId: string,
  espnAthleteId: string
): Promise<LiveScorecardRound[]> {
  try {
    const res = await fetch(
      `${ESPN_PLAYER_SUMMARY}/${espnEventId}/playersummary?player=${espnAthleteId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();

    // Shape confirmed against ESPN's actual response: { rounds: [ { period,
    // value (round total), linescores: [ { period (hole number within the
    // round — not a global index), value (strokes), par } ] } ], ... }
    const rounds: any[] = data?.rounds ?? data?.playerSummary?.rounds ?? [];

    return rounds
      .map((r: any, ri: number): LiveScorecardRound => {
        const holes: any[] = r.linescores ?? r.holes ?? [];
        return {
          round: r.period ?? r.round ?? ri + 1,
          total: r.value ?? r.score ?? r.total ?? null,
          holes: holes.map((h: any, hi: number) => ({
            hole: h.period ?? h.hole ?? hi + 1,
            par: h.par ?? null,
            score: h.value ?? h.score ?? null,
          })),
        };
      })
      .filter((r) => r.holes.length > 0);
  } catch {
    return [];
  }
}

/** Matches our golfer names against ESPN's leaderboard names. Best-effort, name-based. */
export function matchGolferToLive(
  golferName: string,
  live: LiveLeaderboardEntry[]
): LiveLeaderboardEntry | null {
  const target = normalizeName(golferName);
  return live.find((e) => normalizeName(e.name) === target) ?? null;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z\s]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const setA = new Set(a.split(" "));
  const setB = new Set(b.split(" "));
  let shared = 0;
  for (const w of setA) if (setB.has(w)) shared++;
  return shared;
}

/**
 * Tallies pars/birdies/eagles/bogeys/etc. (and bogey-free rounds) across
 * every round played, from hole-by-hole scorecard data. Used to auto-fill
 * a commissioner's result entry — always double-check-able/editable by
 * them before saving, since this depends on ESPN's data being complete.
 */
export function tallyHoleStats(rounds: LiveScorecardRound[]): {
  pars: number;
  birdies: number;
  eagles: number;
  better_than_eagle: number;
  bogeys: number;
  double_bogeys: number;
  worse_than_double: number;
  bogey_free_rounds: number;
} {
  const tally = {
    pars: 0,
    birdies: 0,
    eagles: 0,
    better_than_eagle: 0,
    bogeys: 0,
    double_bogeys: 0,
    worse_than_double: 0,
    bogey_free_rounds: 0,
  };

  for (const round of rounds) {
    let roundHadBogeyOrWorse = false;
    let countedHoles = 0;
    for (const hole of round.holes) {
      if (hole.score === null || hole.par === null) continue;
      countedHoles++;
      const diff = hole.score - hole.par;
      if (diff <= -3) tally.better_than_eagle++;
      else if (diff === -2) tally.eagles++;
      else if (diff === -1) tally.birdies++;
      else if (diff === 0) tally.pars++;
      else if (diff === 1) {
        tally.bogeys++;
        roundHadBogeyOrWorse = true;
      } else if (diff === 2) {
        tally.double_bogeys++;
        roundHadBogeyOrWorse = true;
      } else if (diff > 2) {
        tally.worse_than_double++;
        roundHadBogeyOrWorse = true;
      }
    }
    // A "bogey-free round" needs a complete, finished round with no bogey
    // or worse anywhere in it.
    if (countedHoles >= 18 && !roundHadBogeyOrWorse) tally.bogey_free_rounds++;
  }

  return tally;
}

const SYNC_BATCH_SIZE = 8;

export type SyncResult = {
  synced: number;
  skipped: number;
  total: number;
  reason?: "no_live_event" | "no_live_data";
  error?: string;
};

/**
 * The one shared routine behind both the commissioner's "Sync All From Live
 * Scoring" button and the automatic background sync (Commissioner Tools ->
 * Scoring, and .github/workflows/sync-results.yml): finds every golfer in
 * a tournament's field, pulls their live winnings/finish/made-cut/hole-by-
 * hole from ESPN, and writes it all into tournament_results in one go.
 * `supabase` is passed in so callers can use either the logged-in
 * admin's cookie-based client (the button) or a service-role client with
 * no logged-in user (the automated job) — this function doesn't care which.
 */
export async function syncTournamentResults(supabase: any, tournamentId: string): Promise<SyncResult> {
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .maybeSingle();
  if (!tournament) {
    return { synced: 0, skipped: 0, total: 0, error: "Tournament not found" };
  }

  const espnEventId = await findEspnEventId(tournament as any);
  if (!espnEventId) {
    return { synced: 0, skipped: 0, total: 0, reason: "no_live_event" };
  }

  const liveEntries = await getEspnLeaderboard(espnEventId);
  if (liveEntries.length === 0) {
    return { synced: 0, skipped: 0, total: 0, reason: "no_live_data" };
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

  for (let i = 0; i < golfers.length; i += SYNC_BATCH_SIZE) {
    const batch = golfers.slice(i, i + SYNC_BATCH_SIZE);
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
    const { error } = await supabase
      .from("tournament_results")
      .upsert(rows, { onConflict: "tournament_id,golfer_id" });
    if (error) {
      return { synced: 0, skipped, total: golfers.length, error: error.message };
    }
  }

  return { synced: rows.length, skipped, total: golfers.length };
}

export type FieldSyncResult = {
  matched: number;
  total: number;
  error?: string;
};

/**
 * Auto-loads a tournament's field straight from ESPN's entry list/leaderboard
 * (the same endpoint used for live results — ESPN populates it with the
 * full field and tee times before a round is even played) and writes it
 * into tournament_field, matched against golfers already in your pool by
 * name. Replaces whatever field was previously saved for that tournament,
 * same as the manual "Save Field" button does. Shared by the commissioner's
 * "Auto-load Field" button and the background cron job — `supabase` is
 * either the logged-in admin's cookie client or a service-role client.
 */
export async function syncTournamentField(supabase: any, tournamentId: string): Promise<FieldSyncResult> {
  const { data: tournament } = await supabase.from("tournaments").select("*").eq("id", tournamentId).maybeSingle();
  if (!tournament) return { matched: 0, total: 0, error: "Tournament not found" };

  const espnEventId = await findEspnEventId(tournament as any);
  if (!espnEventId) return { matched: 0, total: 0, error: "No live event found for this tournament yet" };

  const liveEntries = await getEspnLeaderboard(espnEventId);
  if (liveEntries.length === 0) return { matched: 0, total: 0, error: "No field data available yet" };

  const { data: golfersData } = await supabase.from("golfers").select("id,name");
  const pool: { id: string; name: string }[] = golfersData ?? [];

  const matchedIds: string[] = [];
  for (const entry of liveEntries) {
    const target = normalizeName(entry.name);
    const g = pool.find((p) => normalizeName(p.name) === target);
    if (g) matchedIds.push(g.id);
  }

  if (matchedIds.length === 0) {
    return { matched: 0, total: liveEntries.length, error: "None of the live field matched golfers in your pool" };
  }

  const { error: deleteError } = await supabase.from("tournament_field").delete().eq("tournament_id", tournamentId);
  if (deleteError) return { matched: 0, total: liveEntries.length, error: deleteError.message };

  const rows = matchedIds.map((golfer_id) => ({ tournament_id: tournamentId, golfer_id }));
  const { error: insertError } = await supabase.from("tournament_field").insert(rows);
  if (insertError) return { matched: 0, total: liveEntries.length, error: insertError.message };

  return { matched: matchedIds.length, total: liveEntries.length };
}
