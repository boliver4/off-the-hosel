import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Golfer = Database["public"]["Tables"]["golfers"]["Row"];
export type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
export type OneAndDoneStanding = Database["public"]["Views"]["one_and_done_standings"]["Row"];
export type PickWithPoints = Database["public"]["Views"]["one_and_done_pick_points"]["Row"];

/** All active golfers, ordered by world rank. Empty array on any failure. */
export async function getGolfers(): Promise<Golfer[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("golfers")
      .select("*")
      .eq("active", true)
      .order("world_rank", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

/** All tournaments, ordered chronologically. */
export async function getTournaments(): Promise<Tournament[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("tournaments").select("*").order("start_date", { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

/** The next upcoming tournament (today or later); falls back to the most recent past one. */
export async function getFeaturedTournament(): Promise<Tournament | null> {
  const tournaments = await getTournaments();
  if (tournaments.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = tournaments.find((t) => t.end_date >= today);
  return upcoming ?? tournaments[tournaments.length - 1];
}

/** The next upcoming major (today or later); falls back to the most recent past one. */
export async function getFeaturedMajor(): Promise<Tournament | null> {
  const tournaments = await getTournaments();
  const majors = tournaments.filter((t) => t.is_major);
  if (majors.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = majors.find((t) => t.end_date >= today);
  return upcoming ?? majors[majors.length - 1];
}

/** Golfer IDs a given user has already picked in prior One & Done weeks. */
export async function getUsedGolferIds(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("one_and_done_picks").select("golfer_id").eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map((r) => r.golfer_id);
  } catch {
    return [];
  }
}

/** A user's pick for a specific tournament, if any. */
export async function getPickForTournament(userId: string, tournamentId: string) {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("one_and_done_picks")
      .select("*, golfers(*)")
      .eq("user_id", userId)
      .eq("tournament_id", tournamentId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

/** All of a user's picks across the season, newest first, with points + golfer/tournament info. */
export async function getUserPicksWithDetails(userId: string) {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("one_and_done_picks")
      .select("*, golfers(*), tournaments(*)")
      .eq("user_id", userId)
      .order("picked_at", { ascending: false });
    if (error) throw error;

    // Points come from the view — fetch separately and merge, since the
    // view isn't joinable via PostgREST embedding on a plain table select.
    const { data: pointsRows } = await supabase
      .from("one_and_done_pick_points")
      .select("*")
      .eq("user_id", userId);

    const pointsByPickId = new Map((pointsRows ?? []).map((p) => [p.pick_id, p]));

    return (data ?? []).map((pick) => ({
      ...pick,
      points: pointsByPickId.get(pick.id)?.points ?? 0,
      made_cut: pointsByPickId.get(pick.id)?.made_cut ?? null,
    }));
  } catch {
    return [];
  }
}

/** Season standings for the One & Done game, highest points first. */
export async function getOneAndDoneStandings(): Promise<OneAndDoneStanding[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("one_and_done_standings")
      .select("*")
      .order("total_points", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

/** Every pick made for a given tournament, with points — for the live leaderboard. */
export async function getPicksForTournament(tournamentId: string) {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = createClient();
    // Embed via the base table (foreign-key embedding on views isn't
    // reliably supported by PostgREST), then merge in points from the view.
    const { data: picks, error } = await supabase
      .from("one_and_done_picks")
      .select("*, profiles(display_name), golfers(name)")
      .eq("tournament_id", tournamentId);
    if (error) throw error;

    const { data: pointsRows } = await supabase
      .from("one_and_done_pick_points")
      .select("*")
      .eq("tournament_id", tournamentId);
    const pointsByPickId = new Map((pointsRows ?? []).map((p) => [p.pick_id, p]));

    return (picks ?? [])
      .map((pick: any) => ({
        ...pick,
        pick_id: pick.id,
        points: pointsByPickId.get(pick.id)?.points ?? 0,
        made_cut: pointsByPickId.get(pick.id)?.made_cut ?? null,
      }))
      .sort((a, b) => b.points - a.points);
  } catch {
    return [];
  }
}

/** Salaries + golfer info for a Major Challenge lineup builder. */
export async function getGolfersWithSalaries(tournamentId: string) {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("golfer_salaries")
      .select("*, golfers(*)")
      .eq("tournament_id", tournamentId)
      .order("salary", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getMajorLineup(userId: string, tournamentId: string) {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("major_lineups")
      .select("*, major_lineup_golfers(*, golfers(*))")
      .eq("user_id", userId)
      .eq("tournament_id", tournamentId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}
