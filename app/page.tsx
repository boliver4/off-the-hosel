import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import {
  getFeaturedTournament,
  getOneAndDoneStandings,
  getPickForTournament,
} from "@/lib/data";
import { formatMoney, formatPoints } from "@/lib/scoring";
import { PickPhoto } from "@/components/PickPhoto";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const tournament = await getFeaturedTournament();
  const standings = await getOneAndDoneStandings();

  const myPick = profile && tournament ? await getPickForTournament(profile.id, tournament.id) : null;

  return (
    <section id="home" className="screen active dash-home">
      {/* ===== Hero + current tournament ===== */}
      <div className="dash-hero">
        <div className="dash-hero-copy">
          <h1>Every Pick Matters.</h1>
          <p>Follow the tour. Make your picks. Climb the leaderboard.</p>
          <Link href="/my-picks">
            <button className="dash-cta">
              Make Your Pick <b>→</b>
            </button>
          </Link>
        </div>

        {tournament ? (
          <div className="dash-tourney-card">
            <div className="dash-tourney-top">
              <span className="dash-pill">{isUpcoming(tournament) ? "Current Tournament" : "Latest Tournament"}</span>
              <span className="dash-tourney-dates">{formatDateRange(tournament.start_date, tournament.end_date)}</span>
            </div>
            <div className="dash-tourney-title">
              <h2>{tournament.name}</h2>
              {tournament.is_major ? <span className="dash-major-tag">MAJOR</span> : null}
            </div>

            <div className="dash-tourney-stats">
              <div className="dash-stat">
                <span aria-hidden="true">📍</span>
                <div>
                  <b>{tournament.course || "TBD"}</b>
                  <small>{tournament.location || ""}</small>
                </div>
              </div>
              <div className="dash-stat">
                <span aria-hidden="true">🏆</span>
                <div>
                  <b>{tournament.purse ? formatMoney(tournament.purse) : "TBD"}</b>
                  <small>Purse</small>
                </div>
              </div>
              <div className="dash-stat">
                <span aria-hidden="true">👥</span>
                <div>
                  <b>{tournament.field_size || "—"}</b>
                  <small>Players</small>
                </div>
              </div>
            </div>

            <Link href="/tournament-info" className="dash-tourney-btn">
              View Tournament <b>→</b>
            </Link>
          </div>
        ) : (
          <div className="dash-tourney-card">
            <div className="dash-tourney-top">
              <span className="dash-pill">No tournament yet</span>
            </div>
            <div className="dash-tourney-title">
              <h2>Waiting on the schedule</h2>
            </div>
            <p style={{ fontSize: 12, opacity: 0.85 }}>A commissioner needs to add tournaments in Supabase.</p>
          </div>
        )}
      </div>

      {/* ===== Quick links ===== */}
      <div className="dash-quicklinks">
        <Link href="/my-picks" className="dash-qcard dash-qcard-picks">
          <div className="dash-qcard-bottom">
            <div>
              <b>My Picks</b>
              <small>View or make your picks for this week.</small>
            </div>
            <span className="dash-qcard-arrow">→</span>
          </div>
        </Link>

        <Link href="/leaderboard" className="dash-qcard dash-qcard-board">
          <div className="dash-qcard-bottom">
            <div>
              <b>Leaderboard</b>
              <small>See how you stack up against the field.</small>
            </div>
            <span className="dash-qcard-arrow">→</span>
          </div>
        </Link>

        <Link href="/tournament-info" className="dash-qcard dash-qcard-tourney">
          <div className="dash-qcard-bottom">
            <div>
              <b>Tournaments</b>
              <small>Full schedule, purses and course info.</small>
            </div>
            <span className="dash-qcard-arrow">→</span>
          </div>
        </Link>

        <Link href="/standings" className="dash-qcard dash-qcard-standings">
          <div className="dash-qcard-bottom">
            <div>
              <b>Standings</b>
              <small>Season standings and segment results.</small>
            </div>
            <span className="dash-qcard-arrow">→</span>
          </div>
        </Link>
      </div>

      {/* ===== My pick + standings ===== */}
      <div className="dash-lower">
        <div className="dash-lower-left">
          <section className="dash-card">
            <div className="dash-card-head">
              <b>My Pick This Week</b>
              <Link href="/my-picks">Manage Picks →</Link>
            </div>
            {myPick ? (
              <Link href="/my-picks" className="dash-mypick-row">
                <span className="dash-mypick-photo">
                  <PickPhoto name={(myPick as any)?.golfers?.name ?? ""} photoUrl={(myPick as any)?.golfers?.headshot_url} />
                </span>
                <span className="dash-mypick-info">
                  <b>{(myPick as any)?.golfers?.name}</b>
                  <small>{tournament?.name}</small>
                  <small>{tournament?.course}</small>
                </span>
                <span className="dash-mypick-badge">✓ PICKED</span>
                <span className="dash-mypick-arrow">→</span>
              </Link>
            ) : (
              <Link href="/my-picks" className="dash-mypick-row dash-mypick-empty">
                <span className="dash-mypick-info">
                  <b>No pick yet</b>
                  <small>Choose your One &amp; Done golfer for this week</small>
                </span>
                <span className="dash-mypick-arrow">→</span>
              </Link>
            )}
          </section>

          {tournament?.is_major ? (
            <Link href="/major-challenge" className="dash-card dash-major-card dash-major-open">
              <span className="dash-major-icon" aria-hidden="true">🏆</span>
              <span className="dash-major-copy">
                <b>Major Challenge</b>
                <small>Build your 5-golfer lineup for this major</small>
              </span>
              <span className="dash-major-arrow">→</span>
            </Link>
          ) : (
            <div className="dash-card dash-major-card dash-major-locked" aria-disabled="true">
              <span className="dash-major-icon" aria-hidden="true">🏆</span>
              <span className="dash-major-copy">
                <b>Major Challenge</b>
                <small>Available during major championships only.</small>
              </span>
              <span className="dash-major-lock" aria-hidden="true">🔒</span>
            </div>
          )}
        </div>

        <section className="dash-card dash-standings">
          <div className="dash-card-head">
            <b>Season Standings</b>
            <Link href="/standings">View Full Standings →</Link>
          </div>
          <div className="dash-standings-table">
            <div className="dash-srow dash-shead">
              <span>#</span>
              <span>Player</span>
              <span>Points</span>
              <span>Weeks</span>
            </div>
            {standings.length === 0 ? (
              <div className="dash-srow">
                <span style={{ gridColumn: "1 / -1", color: "var(--muted)" }}>No standings yet.</span>
              </div>
            ) : (
              standings.slice(0, 5).map((s, i) => (
                <div className={"dash-srow" + (profile && s.user_id === profile.id ? " dash-srow-me" : "")} key={s.user_id}>
                  <span>{i + 1}</span>
                  <span>{s.display_name}</span>
                  <span>{formatPoints(s.total_points)}</span>
                  <span>{s.weeks_picked}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <p className="dash-footer-quote">
        “Good golf decisions start here.” <span className="dash-footer-mark">Off The Hosel</span>
      </p>
    </section>
  );
}

function isUpcoming(t: { end_date: string }) {
  return t.end_date >= new Date().toISOString().slice(0, 10);
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const year = e.getFullYear();
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}, ${year}`;
}
