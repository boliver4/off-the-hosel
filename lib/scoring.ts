// Fantasy scoring rule for Off The Hosel — points combine hole-by-hole
// bonuses/penalties, a bogey-free-round bonus, a share of tournament
// winnings, and a missed-cut penalty. Every rule is commissioner-editable
// and toggleable (see public.scoring_settings / Commissioner Tools ->
// Scoring). This mirrors the tournament_result_points view in
// supabase/schema.sql exactly — Postgres is the source of truth for any
// *stored* points total; this function exists for client-side previews
// (e.g. showing a commissioner what a result entry is about to be worth
// before they save it) and should never be trusted over what the database
// view returns.
export type ScoringSettings = {
  par_enabled: boolean;
  par_pts: number;
  birdie_enabled: boolean;
  birdie_pts: number;
  eagle_enabled: boolean;
  eagle_pts: number;
  better_eagle_enabled: boolean;
  better_eagle_pts: number;
  bogey_enabled: boolean;
  bogey_pts: number;
  double_bogey_enabled: boolean;
  double_bogey_pts: number;
  worse_double_enabled: boolean;
  worse_double_pts: number;
  bogey_free_enabled: boolean;
  bogey_free_pts: number;
  winnings_pct_enabled: boolean;
  missed_cut_enabled: boolean;
  missed_cut_pts: number;
};

export const DEFAULT_SCORING_SETTINGS: ScoringSettings = {
  par_enabled: true,
  par_pts: 1,
  birdie_enabled: true,
  birdie_pts: 2,
  eagle_enabled: true,
  eagle_pts: 3,
  better_eagle_enabled: true,
  better_eagle_pts: 5,
  bogey_enabled: true,
  bogey_pts: -2,
  double_bogey_enabled: true,
  double_bogey_pts: -3,
  worse_double_enabled: true,
  worse_double_pts: -5,
  bogey_free_enabled: true,
  bogey_free_pts: 1000,
  winnings_pct_enabled: true,
  missed_cut_enabled: true,
  missed_cut_pts: -5000,
};

export type HoleTally = {
  pars: number;
  birdies: number;
  eagles: number;
  better_than_eagle: number;
  bogeys: number;
  double_bogeys: number;
  worse_than_double: number;
  bogey_free_rounds: number;
};

export const EMPTY_HOLE_TALLY: HoleTally = {
  pars: 0,
  birdies: 0,
  eagles: 0,
  better_than_eagle: 0,
  bogeys: 0,
  double_bogeys: 0,
  worse_than_double: 0,
  bogey_free_rounds: 0,
};

/** Simple winnings-% preview, kept for anywhere that only has winnings/madeCut on hand. */
export function fantasyPoints(winnings: number, madeCut: boolean, winningsScoringPct: number): number {
  if (!madeCut) return 0;
  const w = Math.max(0, winnings || 0);
  return Math.round(w * (winningsScoringPct / 100) * 100) / 100;
}

/** Full formula preview — mirrors tournament_result_points exactly. */
export function fantasyPointsFull(
  tally: HoleTally,
  winnings: number,
  madeCut: boolean,
  winningsScoringPct: number,
  settings: ScoringSettings
): number {
  const w = Math.max(0, winnings || 0);
  let points = 0;
  if (settings.par_enabled) points += tally.pars * settings.par_pts;
  if (settings.birdie_enabled) points += tally.birdies * settings.birdie_pts;
  if (settings.eagle_enabled) points += tally.eagles * settings.eagle_pts;
  if (settings.better_eagle_enabled) points += tally.better_than_eagle * settings.better_eagle_pts;
  if (settings.bogey_enabled) points += tally.bogeys * settings.bogey_pts;
  if (settings.double_bogey_enabled) points += tally.double_bogeys * settings.double_bogey_pts;
  if (settings.worse_double_enabled) points += tally.worse_than_double * settings.worse_double_pts;
  if (settings.bogey_free_enabled) points += tally.bogey_free_rounds * settings.bogey_free_pts;
  if (settings.winnings_pct_enabled) points += Math.round(w * (winningsScoringPct / 100) * 100) / 100;
  if (!madeCut && settings.missed_cut_enabled) points += settings.missed_cut_pts;
  return Math.round(points * 100) / 100;
}

export function formatMoney(value: number | null | undefined): string {
  const n = value ?? 0;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function formatPoints(value: number | null | undefined): string {
  const n = value ?? 0;
  // Whole numbers only — the bogey-free/missed-cut bonuses push totals into
  // the thousands, so cents just add clutter and width nothing needs.
  return Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export const MAJOR_CHALLENGE_SALARY_CAP = 50000;
export const MAJOR_CHALLENGE_ROSTER_SIZE = 5;
