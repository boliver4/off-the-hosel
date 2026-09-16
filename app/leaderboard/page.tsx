import Link from "next/link";
import { getFeaturedTournament, getPicksForTournament } from "@/lib/data";
import { formatPoints } from "@/lib/scoring";
import { LiveLeaderboard } from "@/components/LiveLeaderboard";

export default async function LeaderboardPage() {
  const tournament = await getFeaturedTournament();
  const picks = tournament ? await getPicksForTournament(tournament.id) : [];

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

      {tournament ? (
        <>
          <div className="section-label">LIVE FROM THE COURSE</div>
          <LiveLeaderboard tournamentId={tournament.id} />
          <p style={{ color: "var(--muted)", fontSize: 10, margin: "6px 0 18px" }}>
            Tap a player to see their hole-by-hole scorecard. Live data refreshes about once a
            minute.
          </p>
        </>
      ) : null}

      <div className="section-label">FANTASY POINTS</div>
      <div className="card" id="boardList">
        <div className="trow head">
          <span>POS</span>
          <span>PLAYER</span>
          <span>PICKED BY</span>
          <span>PTS</span>
        </div>
        {picks.length === 0 ? (
          <div className="trow">
            <span style={{ gridColumn: "1 / -1", color: "var(--muted)" }}>
              No picks or results recorded for this tournament yet.
            </span>
          </div>
        ) : (
          picks.map((p: any, i: number) => (
            <div className="trow" key={p.pick_id}>
              <b>{i + 1}</b>
              <span>{p.golfers?.name}</span>
              <span>{p.profiles?.display_name}</span>
              <span className="score">{formatPoints(p.points)}</span>
            </div>
          ))
        )}
      </div>
      <p style={{ color: "var(--muted)", fontSize: 10, margin: "6px 0 0" }}>
        Official fantasy points are calculated once your commissioner enters each golfer&rsquo;s
        final winnings after the tournament wraps.
      </p>
    </section>
  );
}
