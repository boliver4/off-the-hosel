"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { fantasyPointsFull, EMPTY_HOLE_TALLY, type HoleTally, type ScoringSettings } from "@/lib/scoring";
import type { Golfer, Tournament } from "@/lib/data";

const TALLY_FIELDS: { key: keyof HoleTally; label: string }[] = [
  { key: "pars", label: "Pars" },
  { key: "birdies", label: "Birdies" },
  { key: "eagles", label: "Eagles" },
  { key: "better_than_eagle", label: "Better than eagle" },
  { key: "bogeys", label: "Bogeys" },
  { key: "double_bogeys", label: "Double bogeys" },
  { key: "worse_than_double", label: "Worse than double" },
  { key: "bogey_free_rounds", label: "Bogey-free rounds" },
];

export function CommissionerResultsForm({
  tournaments,
  golfers,
  scoringSettings,
}: {
  tournaments: Tournament[];
  golfers: Golfer[];
  scoringSettings: ScoringSettings;
}) {
  const [tournamentId, setTournamentId] = useState(tournaments[0]?.id ?? "");
  const [golferId, setGolferId] = useState(golfers[0]?.id ?? "");
  const [winnings, setWinnings] = useState("0");
  const [madeCut, setMadeCut] = useState(true);
  const [finishPosition, setFinishPosition] = useState("");
  const [tally, setTally] = useState<HoleTally>(EMPTY_HOLE_TALLY);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function syncAll() {
    if (!tournamentId) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/sync-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data?.error || "Couldn't sync results");
      } else if (data.reason === "no_live_event" || data.reason === "no_live_data") {
        toast("No live data found for this tournament yet — try again once it tees off.");
      } else {
        toast(`Synced ${data.synced} of ${data.total} golfers from live scoring`);
        router.refresh();
      }
    } catch {
      toast("Couldn't reach live scoring");
    } finally {
      setSyncing(false);
    }
  }

  const tournament = tournaments.find((t) => t.id === tournamentId);
  const preview = tournament
    ? fantasyPointsFull(tally, Number(winnings) || 0, madeCut, tournament.winnings_scoring_pct, scoringSettings)
    : 0;

  function setTallyField(key: keyof HoleTally, value: string) {
    setTally((t) => ({ ...t, [key]: value === "" ? 0 : Number(value) }));
  }

  async function autoFill() {
    if (!tournamentId || !golferId) return;
    setAutoFilling(true);
    try {
      const res = await fetch(`/api/hole-tally?tournamentId=${tournamentId}&golferId=${golferId}`);
      const data = await res.json();
      if (data.found) {
        setTally(data.tally);
        if (data.finishPosition) setFinishPosition(data.finishPosition);
        if (typeof data.winnings === "number") setWinnings(String(data.winnings));
        if (typeof data.madeCut === "boolean") setMadeCut(data.madeCut);
        const parts = [`${data.roundsFound} round${data.roundsFound === 1 ? "" : "s"} of scoring`];
        if (typeof data.winnings === "number") parts.push("winnings");
        if (data.finishPosition) parts.push("finish");
        toast(`Auto-filled from ${parts.join(", ")}`);
      } else {
        toast("No live data found for this golfer/tournament yet — enter it by hand.");
      }
    } catch {
      toast("Couldn't reach live scoring — enter it by hand.");
    } finally {
      setAutoFilling(false);
    }
  }

  async function save() {
    if (!tournamentId || !golferId) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("tournament_results") as any).upsert(
        {
          tournament_id: tournamentId,
          golfer_id: golferId,
          winnings: Number(winnings) || 0,
          made_cut: madeCut,
          finish_position: finishPosition || null,
          ...tally,
        },
        { onConflict: "tournament_id,golfer_id" }
      );
      if (error) throw error;
      toast("Result saved");
      router.refresh();
    } catch (err) {
      toast((err as any)?.message || (err instanceof Error ? err.message : "Couldn't save result"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={{ display: "block" }}>
        <small style={{ display: "block", color: "var(--muted)", marginBottom: 4 }}>Tournament</small>
        <select className="loginfield" value={tournamentId} onChange={(e) => setTournamentId(e.target.value)}>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.winnings_scoring_pct}%)
            </option>
          ))}
        </select>
      </label>

      <div className="sync-all-box">
        <div className="sync-all-copy">
          <b>Sync every golfer at once</b>
          <small>
            Pulls live winnings, finish, and hole-by-hole for the whole field. Once auto-sync is set
            up, this also happens by itself every 15 minutes — use this button anytime you want an
            up-to-the-second pull right now.
          </small>
        </div>
        <button type="button" className="sync-all-btn" disabled={syncing || !tournamentId} onClick={syncAll}>
          {syncing ? "Syncing…" : "Sync All From Live Scoring"}
        </button>
      </div>

      <button
        type="button"
        className="select"
        style={{ alignSelf: "flex-start" }}
        onClick={() => setManualOpen((v) => !v)}
      >
        {manualOpen ? "Hide manual entry ▴" : "Manually enter or correct one golfer ▾"}
      </button>

      {manualOpen ? (
        <>
          <p style={{ color: "var(--muted)", fontSize: 10, margin: 0 }}>
            Already synced above? Use this to double-check or correct one golfer&rsquo;s numbers before
            saving — everything below is editable.
          </p>

          <label style={{ display: "block" }}>
            <small style={{ display: "block", color: "var(--muted)", marginBottom: 4 }}>Golfer</small>
            <select className="loginfield" value={golferId} onChange={(e) => setGolferId(e.target.value)}>
              {golfers.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>

          <div className="results-tally-head" style={{ marginTop: 0 }}>
            <b>Review this one golfer</b>
            <button type="button" className="select" disabled={autoFilling} onClick={autoFill}>
              {autoFilling ? "Checking live scoring…" : "Re-fill from live scoring"}
            </button>
          </div>

          <label style={{ display: "block" }}>
            <small style={{ display: "block", color: "var(--muted)", marginBottom: 4 }}>Winnings ($)</small>
            <input
              className="loginfield"
              type="number"
              min={0}
              step={1}
              value={winnings}
              onChange={(e) => setWinnings(e.target.value)}
            />
          </label>

          <label style={{ display: "block" }}>
            <small style={{ display: "block", color: "var(--muted)", marginBottom: 4 }}>Finish (optional)</small>
            <input
              className="loginfield"
              placeholder="e.g. T4, CUT, WD"
              value={finishPosition}
              onChange={(e) => setFinishPosition(e.target.value)}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={madeCut} onChange={(e) => setMadeCut(e.target.checked)} />
            Made the cut
          </label>

          <div className="results-tally-head">
            <b>Hole-by-hole tally</b>
          </div>
          <div className="results-tally-grid">
            {TALLY_FIELDS.map((f) => (
              <label key={f.key} className="results-tally-field">
                <small>{f.label}</small>
                <input
                  className="loginfield"
                  type="number"
                  min={0}
                  step={1}
                  value={tally[f.key]}
                  onChange={(e) => setTallyField(f.key, e.target.value)}
                />
              </label>
            ))}
          </div>

          <div className="bigrow" style={{ background: "#f5f3ee", borderRadius: 10, border: "1px solid var(--line)" }}>
            <div className="meta">
              <b>Fantasy points preview</b>
              <small>Hole tally + % of winnings + missed-cut penalty, per Scoring Settings</small>
            </div>
            <b>{preview.toLocaleString()}</b>
          </div>

          <button className="submit" disabled={saving || !tournamentId || !golferId} onClick={save}>
            {saving ? "Saving…" : "Save Result"}
          </button>
        </>
      ) : null}
    </div>
  );
}
