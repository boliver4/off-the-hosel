"use client";

import { useEffect, useState, useCallback } from "react";
import { GolferAvatar } from "@/components/GolferAvatar";

type LiveEntry = {
  golferId: string;
  name: string;
  headshotUrl: string | null;
  espnId: string;
  position: string | null;
  score: string | null;
  thru: string | null;
  status: string | null;
  teeTime: string | null;
  pickedBy: string[];
};

type ScorecardRound = {
  round: number;
  total: number | null;
  holes: { hole: number; par: number | null; score: number | null }[];
};

const REFRESH_MS = 60_000;

export function LiveLeaderboard({ tournamentId }: { tournamentId: string }) {
  const [entries, setEntries] = useState<LiveEntry[] | null>(null);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [espnEventId, setEspnEventId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live-leaderboard?tournamentId=${tournamentId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setLive(!!data.live);
      setEntries(data.entries ?? []);
      setEspnEventId(data.espnEventId ?? null);
    } catch {
      setLive(false);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <div className="card" style={{ padding: 16, color: "var(--muted)", fontSize: 12 }}>
        Checking for live scoring…
      </div>
    );
  }

  if (!live || !entries || entries.length === 0) {
    return (
      <div className="card" style={{ padding: 16, color: "var(--muted)", fontSize: 12 }}>
        Live scoring isn&rsquo;t available for this tournament right now — check back once it
        tees off. This pulls from a free public sports feed, so it can occasionally lag or be
        briefly unavailable.
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => rankValue(a.position) - rankValue(b.position));

  return (
    <div className="card" id="liveBoardList">
      <div className="trow head live-head">
        <span>POS</span>
        <span>PLAYER</span>
        <span>THRU</span>
        <span>SCORE</span>
        <span>PICKED BY</span>
      </div>
      {sorted.map((e) => (
        <div key={e.golferId}>
          <button
            type="button"
            className="trow live-row"
            onClick={() => setExpanded(expanded === e.golferId ? null : e.golferId)}
          >
            <b>{e.position ?? "-"}</b>
            <span className="live-player">
              <GolferAvatar name={e.name} photoUrl={e.headshotUrl} size={28} />
              <b>{e.name}</b>
            </span>
            <span>{e.thru ?? "-"}</span>
            <span className="score">{e.score ?? "E"}</span>
            <span className="live-picked-by">
              {e.pickedBy.length > 0 ? e.pickedBy.join(", ") : "—"}
            </span>
          </button>
          {expanded === e.golferId && espnEventId ? (
            <PlayerScorecard eventId={espnEventId} athleteId={e.espnId} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function rankValue(position: string | null): number {
  if (!position) return 999;
  const n = parseInt(position.replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(n) ? 999 : n;
}

function PlayerScorecard({ eventId, athleteId }: { eventId: string; athleteId: string }) {
  const [rounds, setRounds] = useState<ScorecardRound[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/live-scorecard?eventId=${eventId}&athleteId=${athleteId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setRounds(d.rounds ?? []);
      })
      .catch(() => {
        if (!cancelled) setRounds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, athleteId]);

  if (rounds === null) {
    return (
      <div className="scorecard-panel">
        <span style={{ color: "var(--muted)", fontSize: 11 }}>Loading scorecard…</span>
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="scorecard-panel">
        <span style={{ color: "var(--muted)", fontSize: 11 }}>
          Hole-by-hole scorecard isn&rsquo;t available for this player yet.
        </span>
      </div>
    );
  }

  return <ScorecardRounds rounds={rounds} />;
}

function ScorecardRounds({ rounds }: { rounds: ScorecardRound[] }) {
  const [selected, setSelected] = useState(rounds[rounds.length - 1].round);
  const active = rounds.find((r) => r.round === selected) ?? rounds[rounds.length - 1];

  return (
    <div className="scorecard-panel">
      {rounds.length > 1 ? (
        <div className="scorecard-round-tabs">
          {rounds.map((r) => (
            <button
              key={r.round}
              type="button"
              className={r.round === selected ? "scorecard-round-tab active" : "scorecard-round-tab"}
              onClick={() => setSelected(r.round)}
            >
              R{r.round}
            </button>
          ))}
        </div>
      ) : null}
      <div className="scorecard-round">
        <span className="scorecard-round-label">
          R{active.round}
          {active.total !== null ? <b> {active.total}</b> : null}
        </span>
        <div className="scorecard-holes">
          {active.holes.map((h) => (
            <span
              key={h.hole}
              className={`scorecard-hole ${holeClass(h.score, h.par)}`}
              title={`Hole ${h.hole}${h.par ? ` · Par ${h.par}` : ""}`}
            >
              {h.score ?? "-"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Classic scorecard marks: circle = birdie, double circle = eagle or better, square = bogey, double square = double bogey or worse, plain = par. */
function holeClass(score: number | null, par: number | null): string {
  if (score === null || par === null) return "";
  const diff = score - par;
  if (diff <= -2) return "eagle";
  if (diff === -1) return "birdie";
  if (diff === 1) return "bogey";
  if (diff >= 2) return "double-bogey";
  return "par";
}
