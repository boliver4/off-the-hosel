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
        return {
          espnId: String(c.id ?? c.athlete?.id ?? ""),
          name,
          position: c.position?.displayName ?? c.status?.position?.displayName ?? null,
          score:
            (typeof c.score === "string" ? c.score : c.score?.displayValue) ??
            c.status?.score ??
            null,
          thru: c.status?.thru ?? (typeof c.status?.detail === "string" ? c.status.detail : null),
          teeTime: c.status?.teeTime ?? null,
          status: c.status?.type?.description ?? c.status?.detail ?? null,
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

function normalizeName(name: string): string {
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
