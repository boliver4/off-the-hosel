import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import {
  getFeaturedTournament,
  getOneAndDoneStandings,
  getPickForTournament,
  getPicksForTournament,
} from "@/lib/data";
import { formatMoney, formatPoints } from "@/lib/scoring";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const tournament = await getFeaturedTournament();
  const standings = await getOneAndDoneStandings();

  const myPick = profile && tournament ? await getPickForTournament(profile.id, tournament.id) : null;
  const tournamentPicks = tournament ? await getPicksForTournament(tournament.id) : [];

  return (
    <section id="home" className="screen active professional-home oth-home">
      <div className="oth-top">
        <section className="oth-hero">
          <div className="oth-hero-copy">
            <span>FANTASY GOLF DONE RIGHT</span>
            <h1>Off The Hosel</h1>
            <p>Learn the games, scoring, and season format.</p>
            <Link href="/how-to-works">
              <button>
                How It Works <b>→</b>
              </button>
            </Link>
          </div>
        </section>

        {tournament ? (
          <section className="oth-next tournament-focus">
            <div className="tournament-shade"></div>
            <div className="tournament-top">
              <div>
                <span className="oth-pill">{isUpcoming(tournament) ? "Next Tournament" : "Latest Tournament"}</span>
                <h2>{tournament.name}</h2>
                <p className="event-dates">{formatDateRange(tournament.start_date, tournament.end_date)}</p>
              </div>
              {tournament.field_size ? (
                <div className="field-badge">
                  <span>FIELD</span>
                  <b>{tournament.field_size}</b>
                  <small>players</small>
                </div>
              ) : null}
            </div>

            <div className="tournament-details">
              <div className="detail-card">
                <span>LOCATION</span>
                <b>{tournament.course || "TBD"}</b>
                <small>{tournament.location || ""}</small>
              </div>
              <div className="detail-card">
                <span>PURSE</span>
                <b>{tournament.purse ? formatMoney(tournament.purse) : "TBD"}</b>
                <small>Total purse</small>
              </div>
              <div className="detail-card">
                <span>SCORING</span>
                <b>{tournament.winnings_scoring_pct}%</b>
                <small>{tournament.is_major ? "Major — weighted scoring" : "of winnings → points"}</small>
              </div>
            </div>

            <div className="pick-deadline">
              <div className="deadline-copy">
                <span>PICK DEADLINE</span>
                <b>Before first tee time</b>
                <small>Your selection locks automatically once the tournament starts.</small>
              </div>
            </div>
          </section>
        ) : (
          <section className="oth-next tournament-focus">
            <div className="tournament-top">
              <div>
                <span className="oth-pill">No tournament yet</span>
                <h2>Waiting on the schedule</h2>
                <p className="event-dates">A commissioner needs to add tournaments in Supabase.</p>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="oth-games">
        <Link href="/one-done" className="oth-game oth-one">
          <div>
            <span>SEASON-LONG GAME</span>
            <h3>One &amp; Done</h3>
            <p>
              ✓ One golfer per week.
              <br />✓ Can&rsquo;t use them again.
              <br />✓ Season-long competition.
            </p>
            <em>Make Picks &nbsp;→</em>
          </div>
        </Link>

        <Link href="/major-challenge" className="oth-game oth-major">
          <div>
            <span>MAJOR CHAMPIONSHIPS</span>
            <h3>Major Challenge</h3>
            <p>
              ✓ $50,000 salary cap.
              <br />✓ Build a 5-golfer lineup.
              <br />✓ Only for the majors.
            </p>
            <em>Make Picks &nbsp;→</em>
          </div>
        </Link>
      </div>

      <div className="quickgrid photo-links dynamic-links">
        <Link href="/leaderboard" className="quick tournament-leader-card">
          <div className="tlc-head">
            <div>
              <span className="tlc-kicker">CURRENT TOURNAMENT</span>
              <b>Leaderboard</b>
            </div>
            <span className="tlc-link">Full Board →</span>
          </div>
          <div className="tlc-columns">
            <span>POS</span>
            <span>PLAYER</span>
            <span>PICKED BY</span>
            <span>PTS</span>
          </div>
          <div className="tlc-list">
            {tournamentPicks.length === 0 ? (
              <div className="trow">
                <span style={{ gridColumn: "1 / -1", color: "var(--muted)" }}>No picks recorded yet this week.</span>
              </div>
            ) : (
              tournamentPicks.slice(0, 5).map((p: any, i: number) => (
                <div className="trow" key={p.pick_id}>
                  <b>{i + 1}</b>
                  <span>{(p as any).golfers?.name}</span>
                  <span>{(p as any).profiles?.display_name}</span>
                  <span className="score">{formatPoints(p.points)}</span>
                </div>
              ))
            )}
          </div>
        </Link>

        <Link href="/my-picks" className="quick photo-card my-pick-card approved-pick-card">
          <div className="approved-pick-main">
            <div className="approved-pick-photo">
              <span className="approved-pick-badge">{myPick ? "CURRENT PICK" : "NO PICK"}</span>
            </div>
            <div className="approved-pick-details">
              <div className="approved-pick-tournament">{tournament?.name || "—"}</div>
              <div className="approved-pick-name">{(myPick as any)?.golfers?.name || "No Pick Selected"}</div>
              <div className="approved-pick-rank">
                {myPick ? "Locked in for this week" : "Choose your One & Done golfer"}
              </div>
            </div>
          </div>
          <div className="approved-pick-footer">
            <div className="approved-pick-footer-copy">
              <b>My Pick</b>
              <small>View and manage your pick.</small>
            </div>
            <span className="approved-pick-arrow">→</span>
          </div>
        </Link>

        <Link href="/major-challenge" className="quick photo-card major-progress-card">
          <div className="major-progress-head">
            <div>
              <span>MAJOR CHALLENGE</span>
              <b>My Major Picks</b>
            </div>
          </div>
          <div className="copy major-copy">
            <div className="copy-text">
              <b>Major Picks</b>
              <small>Build a lineup for the next major</small>
            </div>
            <span className="go">→</span>
          </div>
        </Link>

        <Link href="/tournament-info" className="quick photo-card info">
          <div className="photo"></div>
          <div className="copy">
            <div className="copy-text">
              <b>Tournament Info</b>
              <small>Field, purse, location and scoring.</small>
            </div>
            <span className="go">→</span>
          </div>
        </Link>
      </div>

      <div className="standings-duo">
        <section className="standings-card">
          <div className="standings-head">
            <div>
              <span className="standings-kicker">ONE &amp; DONE</span>
              <h3>Season Standings</h3>
            </div>
          </div>
          <div className="standings-subhead">
            <span>Overall Season</span>
            <Link href="/standings">View Full Standings</Link>
          </div>
          <div className="standings-table">
            <div className="srow shead">
              <span>RANK</span>
              <span>PLAYER</span>
              <span>PTS</span>
              <span>WEEKS</span>
            </div>
            {standings.length === 0 ? (
              <div className="srow">
                <span style={{ gridColumn: "1 / -1", color: "var(--muted)" }}>No standings yet.</span>
              </div>
            ) : (
              standings.slice(0, 5).map((s, i) => (
                <div className="srow" key={s.user_id}>
                  <span>{i + 1}</span>
                  <span>{s.display_name}</span>
                  <span>{formatPoints(s.total_points)}</span>
                  <span>{s.weeks_picked}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="standings-card">
          <div className="standings-head">
            <div>
              <span className="standings-kicker">MAJOR CHALLENGE</span>
              <h3>Major Picks Standings</h3>
            </div>
            <div className="major-badge">MAJORS</div>
          </div>
          <div className="standings-subhead">
            <span>Current Major</span>
            <Link href="/major-challenge">View Major Challenge</Link>
          </div>
          <div className="standings-table">
            <div className="srow shead">
              <span>RANK</span>
              <span>PLAYER</span>
              <span>PTS</span>
              <span>GOLFERS</span>
            </div>
            <div className="srow">
              <span style={{ gridColumn: "1 / -1", color: "var(--muted)" }}>
                Standings appear once lineups are submitted for a major.
              </span>
            </div>
          </div>
        </section>
      </div>
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
