import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getOneAndDoneStandings, getProfileById, getSegmentStandings, getUserPicksWithDetails } from "@/lib/data";
import { formatPoints } from "@/lib/scoring";
import { GolferAvatar } from "@/components/GolferAvatar";

/**
 * A member's public profile: their season rank, segment standings, and
 * full pick history. Anyone can open this (same access as Standings/
 * Leaderboard), but a pick only shows who they took once that
 * tournament's deadline has passed — same reveal rule as everywhere
 * else — except the member always sees their own picks in full.
 */
export default async function MemberProfilePage({ params }: { params: { id: string } }) {
  const [viewer, member] = await Promise.all([getCurrentProfile(), getProfileById(params.id)]);
  if (!member) notFound();

  const [standings, segmentStandings, picks] = await Promise.all([
    getOneAndDoneStandings(),
    getSegmentStandings(),
    getUserPicksWithDetails(params.id, viewer?.id ?? null),
  ]);

  const rankIndex = standings.findIndex((s) => s.user_id === params.id);
  const standing = rankIndex >= 0 ? standings[rankIndex] : null;
  const isSelf = viewer?.id === params.id;

  const memberSegments = Array.from(segmentStandings.entries())
    .map(([segment, rows]) => {
      const i = rows.findIndex((r) => r.user_id === params.id);
      return i >= 0 ? { segment, rank: i + 1, points: rows[i].total_points } : null;
    })
    .filter(Boolean) as { segment: string; rank: number; points: number }[];

  // Season timeline order (earliest tournament first), not "most recently picked".
  const timeline = [...picks].sort((a: any, b: any) => {
    const da = a.tournaments?.start_date ?? "";
    const db = b.tournaments?.start_date ?? "";
    return da < db ? -1 : da > db ? 1 : 0;
  });

  return (
    <section id="member-profile" className="screen active">
      <div className="pagehead">
        <Link href="/standings" className="back">
          ‹
        </Link>
        <h1>
          {member.display_name}
          {isSelf ? " (you)" : ""}
        </h1>
      </div>

      <div className="card" style={{ padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
        <div className="meta">
          <b>Overall</b>
          <small>{standing ? `${standing.weeks_picked} week${standing.weeks_picked === 1 ? "" : "s"} picked` : "No picks yet"}</small>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <b style={{ fontSize: 20 }}>{rankIndex >= 0 ? `#${rankIndex + 1}` : "—"}</b>
          <small style={{ display: "block", color: "var(--muted)" }}>{standing ? `${formatPoints(standing.total_points)} pts` : "—"}</small>
        </div>
      </div>

      {memberSegments.length > 0 ? (
        <div className="card" style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
          {memberSegments.map((s) => (
            <div key={s.segment} style={{ minWidth: 90 }}>
              <small style={{ color: "var(--muted)", display: "block" }}>{s.segment}</small>
              <b>
                #{s.rank} · {formatPoints(s.points)} pts
              </b>
            </div>
          ))}
        </div>
      ) : null}

      <div className="section-label" style={{ marginTop: 16 }}>
        PICK HISTORY
      </div>
      <div className="card">
        {timeline.length === 0 ? (
          <div className="bigrow">
            <div className="meta">
              <b>No picks yet</b>
              <small>Nothing made this season so far.</small>
            </div>
          </div>
        ) : (
          timeline.map((pick: any) => (
            <div className="bigrow" key={pick.id}>
              {pick.revealed ? (
                <>
                  <GolferAvatar name={pick.golfers?.name ?? ""} photoUrl={pick.golfers?.headshot_url} />
                  <div className="meta">
                    <b>{pick.golfers?.name}</b>
                    <small>
                      {pick.tournaments?.name}
                      {pick.made_cut === false ? " • Missed Cut" : ""}
                    </small>
                  </div>
                  <b>{formatPoints(pick.points)} pts</b>
                </>
              ) : (
                <>
                  <GolferAvatar name="?" photoUrl={null} />
                  <div className="meta">
                    <b className="pick-status pick-status-made">Picked — hidden until start</b>
                    <small>{pick.tournaments?.name}</small>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
