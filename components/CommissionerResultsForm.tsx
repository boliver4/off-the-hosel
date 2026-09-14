"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { fantasyPoints } from "@/lib/scoring";
import type { Golfer, Tournament } from "@/lib/data";

export function CommissionerResultsForm({ tournaments, golfers }: { tournaments: Tournament[]; golfers: Golfer[] }) {
  const [tournamentId, setTournamentId] = useState(tournaments[0]?.id ?? "");
  const [golferId, setGolferId] = useState(golfers[0]?.id ?? "");
  const [winnings, setWinnings] = useState("0");
  const [madeCut, setMadeCut] = useState(true);
  const [finishPosition, setFinishPosition] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const tournament = tournaments.find((t) => t.id === tournamentId);
  const preview = tournament ? fantasyPoints(Number(winnings) || 0, madeCut, tournament.winnings_scoring_pct) : 0;

  async function save() {
    if (!tournamentId || !golferId) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("tournament_results").upsert(
        {
          tournament_id: tournamentId,
          golfer_id: golferId,
          winnings: Number(winnings) || 0,
          made_cut: madeCut,
          finish_position: finishPosition || null,
        },
        { onConflict: "tournament_id,golfer_id" }
      );
      if (error) throw error;
      toast("Result saved");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't save result");
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

      <div className="bigrow" style={{ background: "#f5f3ee", borderRadius: 10, border: "1px solid var(--line)" }}>
        <div className="meta">
          <b>Fantasy points preview</b>
          <small>winnings × scoring % (0 if missed cut)</small>
        </div>
        <b>{preview.toLocaleString()}</b>
      </div>

      <button className="submit" disabled={saving || !tournamentId || !golferId} onClick={save}>
        {saving ? "Saving…" : "Save Result"}
      </button>
    </div>
  );
}
