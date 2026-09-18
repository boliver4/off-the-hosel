import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { syncTournamentField } from "@/lib/live-scores";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/sync-field  { tournamentId }
 *
 * The "Auto-load Field" button on Commissioner Tools -> Tournament Field —
 * a commissioner-triggered version of syncTournamentField(). Requires admin
 * (enforced by RLS on the write, since this uses the logged-in user's own
 * cookie-based Supabase client).
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
  const result = await syncTournamentField(supabase, tournamentId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
