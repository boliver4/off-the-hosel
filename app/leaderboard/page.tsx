import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { getFeaturedTournament, getPickBoard } from "@/lib/data";
import { formatPoints } from "@/lib/scoring";
import { LiveLeaderboard } from "@/components/LiveLeaderboard";

export default async function LeaderboardPage() {
  const tournament = await getFeaturedTournament();
  const profile = await getCurrentProfile();
  // Picks lock at the first tee time, so once the tournament has started
  // (today is on/after its start date) everyone's pick is revealed to
  // everyone. Before that, a member only ever sees their own pick.
  const deadlinePassed = tournament ? tournament.start_date <= new Date().toISOString().slice(0, 10) : false;
  const board = tournament ? await getPickBoard(tournament.id, profile?.id ?? null, deadlinePassed) : [];

  return (
    <section id="board" className="screen active">
      <div className="pagehead">
        <Link href="/" className="back">
          ‹
        </Link>
        <h1>Live Leaderboard</h1>
      </div>
      {tournament && (
        <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 10px" }}>{tournament.name}</p>
      )}

      <div className="section-label">THIS WEEK&rsquo;S PICKS</div>
      <div className="card" id="boardList">
        <div className="trow pickboard-row head">
          <span>PLAYER</span>
          <span>{deadlinePassed ? "GOLFER" : "PICK"}</span>
          <span>PTS</span>
        </div>
        {board.length === 0 ? (
          <div className="trow pickboard-row">
            <span style={{ gridColumn: "1 / -1", color: "var(--muted)" }}>
              No league members yet.
            </span>
          </div>
        ) : (
          board.map((row) => (
            <div className="trow pickboard-row" key={row.user_id}>
              <Link href={`/members/${row.user_id}`} style={{ textDecoration: "underline" }}>
                {row.display_name}
                {row.is_viewer ? " (you)" : ""}
              </Link>
              {row.has_pick ? (
                row.golfer_name ? (
                  <span>{row.golfer_name}</span>
                ) : (
                  <span className="pick-status pick-status-made">✓ Picked</span>
                )
              ) : (
                <span className="pick-status pick-status-none">Not picked yet</span>
              )}
              <span className="score">{row.has_pick ? formatPoints(row.points) : "—"}</span>
            </div>
          ))
        )}
      </div>
      <p style={{ color: "var(--muted)", fontSize: 10, margin: "6px 0 18px" }}>
        {deadlinePassed
          ? "Picks are locked in and visible to everyone now that the tournament has started. Official fantasy points are calculated once your commissioner enters each golfer’s final winnings after the tournament wraps."
          : "Who picked what stays private until the tournament starts — until then you can only see your own pick. Everyone can see who has and hasn’t picked yet."}
      </p>

      {tournament ? (
        <>
          <div className="section-label">LIVE FROM THE COURSE</div>
          <LiveLeaderboard tournamentId={tournament.id} />
          <p style={{ color: "var(--muted)", fontSize: 10, margin: "6px 0 0" }}>
            Tap a player to see their hole-by-hole scorecard. Live data refreshes about once a
            minute.
          </p>
        </>
      ) : null}
    </section>
  );
}
