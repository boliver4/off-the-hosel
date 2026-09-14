import Link from "next/link";
import { getTournaments } from "@/lib/data";
import { formatMoney } from "@/lib/scoring";

export default async function TournamentInfoPage() {
  const tournaments = await getTournaments();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section id="info" className="screen active">
      <div className="pagehead">
        <Link href="/" className="back">
          ‹
        </Link>
        <h1>Tournament Info</h1>
      </div>
      <div className="card">
        {tournaments.length === 0 ? (
          <div className="bigrow">
            <div className="meta">
              <b>No tournaments yet</b>
              <small>A commissioner needs to add the schedule.</small>
            </div>
          </div>
        ) : (
          tournaments.map((t) => (
            <div className="bigrow" key={t.id}>
              <div className="meta">
                <b>
                  {t.name}
                  {t.is_major ? " ★" : ""}
                </b>
                <small>
                  {t.course || "Course TBD"} • {formatDate(t.start_date)}–{formatDate(t.end_date)}
                  {t.purse ? ` • ${formatMoney(t.purse)} purse` : ""}
                </small>
              </div>
              <b style={{ color: t.end_date < today ? "var(--muted)" : "var(--g)" }}>
                {t.winnings_scoring_pct}%
              </b>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
