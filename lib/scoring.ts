// Fantasy scoring rule for Off The Hosel:
//
//   points = golferWinnings * (tournament.winnings_scoring_pct / 100)
//   points = 0 if the golfer missed the cut
//
// The percentage is configurable PER TOURNAMENT (commissioner sets it when
// creating/editing a tournament) so majors can be weighted higher than a
// regular tour stop.
//
// This mirrors public.fantasy_points() in supabase/schema.sql exactly.
// Postgres (via the tournament_result_points / one_and_done_pick_points /
// major_lineup_points views) is the source of truth for any *stored* points
// total — this function exists for client-side previews (e.g. showing a
// commissioner what a result entry is about to be worth before they save it)
// and should never be trusted over what the database views return.
export function fantasyPoints(winnings: number, madeCut: boolean, winningsScoringPct: number): number {
  if (!madeCut) return 0;
  const w = Math.max(0, winnings || 0);
  return Math.round(w * (winningsScoringPct / 100) * 100) / 100;
}

export function formatMoney(value: number | null | undefined): string {
  const n = value ?? 0;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function formatPoints(value: number | null | undefined): string {
  const n = value ?? 0;
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export const MAJOR_CHALLENGE_SALARY_CAP = 50000;
export const MAJOR_CHALLENGE_ROSTER_SIZE = 5;
