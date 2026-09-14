import Link from "next/link";
import { getOneAndDoneStandings } from "@/lib/data";
import { formatPoints } from "@/lib/scoring";

export default async function StandingsPage() {
  const standings = await getOneAndDoneStandings();

  return (
    <section id="season" className="screen active">
      <div className="pagehead">
        <Link href="/" className="back">
          ‹
        </Link>
        <h1>Season Standings</h1>
      </div>
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
    </section>
  );
}
