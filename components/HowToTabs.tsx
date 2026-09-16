"use client";

import Link from "next/link";
import { useState } from "react";

type GameKey = "one-done" | "major";

export function HowToTabs() {
  const [active, setActive] = useState<GameKey>("one-done");

  return (
    <>
      <div className="howto-tabs">
        <button
          type="button"
          className={active === "one-done" ? "howto-tab active" : "howto-tab"}
          onClick={() => setActive("one-done")}
        >
          One &amp; Done
        </button>
        <button
          type="button"
          className={active === "major" ? "howto-tab active" : "howto-tab"}
          onClick={() => setActive("major")}
        >
          Major Challenge
        </button>
      </div>

      {active === "one-done" ? (
        <div className="howto-panel">
          <div className="howto-step">
            <div className="step-number">1</div>
            <div className="step-card">
              <div className="step-copy">
                <span className="howto-kicker">ONE &amp; DONE</span>
                <h2>Pick one golfer each week</h2>
                <p>
                  Choose one golfer for the tournament. Once you use that golfer, they are locked out for
                  the rest of the season.
                </p>
                <div className="step-pills">
                  <span>1 golfer per week</span>
                  <span>Season-long lockout</span>
                  <span>Every pick matters</span>
                </div>
              </div>
            </div>
          </div>

          <div className="howto-step">
            <div className="step-number">2</div>
            <div className="step-card scoring-step">
              <div className="step-copy">
                <span className="howto-kicker">SCORING</span>
                <h2>Points for every hole, plus a share of winnings</h2>
                <p>
                  Your golfer earns or loses points hole by hole, plus a share of what they actually
                  win ($) that week. Your commissioner sets these numbers in Scoring Settings — the
                  defaults are shown below.
                </p>
              </div>

              <div className="scoring-grid">
                <div className="scoring-chip good">
                  <span>Birdie</span>
                  <b>+2</b>
                </div>
                <div className="scoring-chip good">
                  <span>Eagle</span>
                  <b>+3</b>
                </div>
                <div className="scoring-chip good">
                  <span>Better than eagle</span>
                  <b>+5</b>
                </div>
                <div className="scoring-chip neutral">
                  <span>Par</span>
                  <b>+1</b>
                </div>
                <div className="scoring-chip bad">
                  <span>Bogey</span>
                  <b>-2</b>
                </div>
                <div className="scoring-chip bad">
                  <span>Double bogey</span>
                  <b>-3</b>
                </div>
                <div className="scoring-chip bad">
                  <span>Worse than double</span>
                  <b>-5</b>
                </div>
                <div className="scoring-chip good">
                  <span>Bogey-free round</span>
                  <b>+1000</b>
                </div>
              </div>

              <div className="bonus-row">
                <div className="bonus-card">
                  <span>% of money won</span>
                  <b>set per event</b>
                  <small>added on top of hole-by-hole points</small>
                </div>
                <div className="bonus-card danger">
                  <span>Missed cut</span>
                  <b>-5000</b>
                  <small>Stacks with points already earned that week</small>
                </div>
              </div>
            </div>
          </div>

          <div className="howto-step">
            <div className="step-number">3</div>
            <div className="step-card">
              <div className="step-copy">
                <span className="howto-kicker">RESULTS</span>
                <h2>Your commissioner enters results by hand</h2>
                <p>
                  After each tournament wraps, the commissioner enters your golfer&rsquo;s official
                  winnings and your standings update right away.
                </p>
              </div>
            </div>
          </div>

          <div className="howto-actions">
            <Link href="/" className="howto-secondary">
              Back to Home
            </Link>
            <Link href="/one-done" className="howto-primary">
              Go to One &amp; Done <span>→</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="howto-panel">
          <div className="howto-step">
            <div className="step-number">1</div>
            <div className="step-card">
              <div className="step-copy">
                <span className="howto-kicker">MAJOR CHALLENGE</span>
                <h2>Build a five-golfer lineup</h2>
                <p>For each of the four majors, build a separate fantasy lineup using a $50,000 salary cap.</p>
                <div className="step-pills">
                  <span>$50,000 cap</span>
                  <span>5 golfers</span>
                  <span>Majors only</span>
                </div>
              </div>
            </div>
          </div>

          <div className="howto-step">
            <div className="step-number">2</div>
            <div className="step-card scoring-step">
              <div className="step-copy">
                <span className="howto-kicker">SCORING</span>
                <h2>Each golfer scores hole by hole, plus winnings</h2>
                <p>
                  Every golfer in your lineup earns or loses points hole by hole, plus a share of what
                  they win ($) that week — same rules as One &amp; Done, set in Scoring Settings.
                </p>
              </div>

              <div className="scoring-grid">
                <div className="scoring-chip good">
                  <span>Birdie</span>
                  <b>+2</b>
                </div>
                <div className="scoring-chip good">
                  <span>Eagle</span>
                  <b>+3</b>
                </div>
                <div className="scoring-chip good">
                  <span>Better than eagle</span>
                  <b>+5</b>
                </div>
                <div className="scoring-chip neutral">
                  <span>Par</span>
                  <b>+1</b>
                </div>
                <div className="scoring-chip bad">
                  <span>Bogey</span>
                  <b>-2</b>
                </div>
                <div className="scoring-chip bad">
                  <span>Double bogey</span>
                  <b>-3</b>
                </div>
                <div className="scoring-chip bad">
                  <span>Worse than double</span>
                  <b>-5</b>
                </div>
                <div className="scoring-chip good">
                  <span>Bogey-free round</span>
                  <b>+1000</b>
                </div>
              </div>

              <div className="bonus-row">
                <div className="bonus-card">
                  <span>% of money won</span>
                  <b>set per event</b>
                  <small>higher for majors — added on top of hole points</small>
                </div>
                <div className="bonus-card danger">
                  <span>Missed cut</span>
                  <b>-5000</b>
                  <small>Stacks with points already earned that week</small>
                </div>
              </div>
            </div>
          </div>

          <div className="howto-step">
            <div className="step-number">3</div>
            <div className="step-card">
              <div className="step-copy">
                <span className="howto-kicker">RESULTS</span>
                <h2>Your commissioner enters results by hand</h2>
                <p>
                  After the major wraps, the commissioner enters each golfer&rsquo;s official winnings.
                  Your lineup&rsquo;s total points are calculated automatically.
                </p>
              </div>
            </div>
          </div>

          <div className="howto-actions">
            <Link href="/" className="howto-secondary">
              Back to Home
            </Link>
            <Link href="/major-challenge" className="howto-primary alt">
              Go to Major Challenge <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
