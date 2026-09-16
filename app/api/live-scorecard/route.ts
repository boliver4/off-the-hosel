import { NextRequest, NextResponse } from "next/server";
import { getEspnScorecard } from "@/lib/live-scores";

export const dynamic = "force-dynamic";

/** GET /api/live-scorecard?eventId=...&athleteId=... — hole-by-hole, best-effort. */
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");
  const athleteId = req.nextUrl.searchParams.get("athleteId");
  if (!eventId || !athleteId) {
    return NextResponse.json({ rounds: [] });
  }
  const rounds = await getEspnScorecard(eventId, athleteId);
  return NextResponse.json({ rounds });
}
