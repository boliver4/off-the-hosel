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
                <h2>You earn a share of their winnings</h2>
                <p>
                  Your golfer&rsquo;s fantasy points are a percentage of what they actually win ($) that
                  week. Your commissioner sets the percentage for each event.
                </p>
              </div>

              <div className="bonus-row">
                <div className="bonus-card">
                  <span>Regular tour event</span>
                  <b>~1%</b>
                  <small>$1,000,000 won ≈ 10,000 fantasy points</small>
                </div>
                <div className="bonus-card danger">
                  <span>Missed cut</span>
                  <b>0 pts</b>
                  <small>No winnings, no points that week</small>
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
                <h2>Each golfer earns a share of their winnings</h2>
                <p>
                  Every golfer in your lineup earns fantasy points based on a percentage of what they win
                  ($) that week. Majors carry a higher percentage than a regular event.
                </p>
              </div>

              <div className="bonus-row">
                <div className="bonus-card">
                  <span>Major championship</span>
                  <b>~3%</b>
                  <small>Weighted higher — set per tournament</small>
                </div>
                <div className="bonus-card danger">
                  <span>Missed cut</span>
                  <b>0 pts</b>
                  <small>No winnings, no points for that golfer</small>
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
