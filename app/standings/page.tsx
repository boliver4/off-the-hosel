import Link from "next/link";
import { getCurrentSegment, getOneAndDoneStandings, getSegmentStandings } from "@/lib/data";
import { formatPoints } from "@/lib/scoring";

export default async function StandingsPage() {
  const [standings, segmentStandings, currentSegment] = await Promise.all([
    getOneAndDoneStandings(),
    getSegmentStandings(),
    getCurrentSegment(),
  ]);

  return (
    <section id="season" className="screen active">
      <div className="pagehead">
        <Link href="/" className="back">
          ‹
        </Link>
        <h1>Season Standings</h1>
      </div>
      <div className="section-label">OVERALL</div>
      <div className="card" id="seasonList">
        {standings.length === 0 ? (
          <div className="bigrow">
            <div className="meta">
              <b>No standings yet</b>
              <small>Standings populate as picks and results come in.</small>
            </div>
          </div>
        ) : (
          standings.map((s, i) => (
            <div className="bigrow" key={s.user_id}>
              <div className="meta">
                <b>
                  {i + 1}. {s.display_name}
                </b>
                <small>{s.weeks_picked} week{s.weeks_picked === 1 ? "" : "s"} picked</small>
              </div>
              <b>{formatPoints(s.total_points)}</b>
            </div>
          ))
        )}
      </div>

      {Array.from(segmentStandings.entries()).map(([segment, rows]) => (
        <div key={segment}>
          <div className="section-label" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
            {segment.toUpperCase()}
            {segment === currentSegment ? <span className="tourney-current-badge">CURRENT</span> : null}
          </div>
          <div className="card">
            {rows.map((s, i) => (
              <div className="bigrow" key={s.user_id}>
                <div className="meta">
                  <b>
                    {i + 1}. {s.display_name}
                  </b>
                  <small>
                    {s.weeks_picked} week{s.weeks_picked === 1 ? "" : "s"} picked
                  </small>
                </div>
                <b>{formatPoints(s.total_points)}</b>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
