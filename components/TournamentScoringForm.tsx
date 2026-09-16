"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import type { Tournament } from "@/lib/data";

/**
 * Lets a commissioner change the winnings % for one tournament at a time.
 * Each row saves only that tournament's own row (winnings_scoring_pct is
 * stored per-tournament in the database already) — changing one week's
 * percentage never touches any other week's stored value, past or future.
 */
export function TournamentScoringForm({ tournaments }: { tournaments: Tournament[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(tournaments.map((t) => [t.id, String(t.winnings_scoring_pct)]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function save(tournamentId: string) {
    setSavingId(tournamentId);
    try {
      const supabase = createClient();
      const pct = Number(values[tournamentId]) || 0;
      const { error } = await (supabase.from("tournaments") as any)
        .update({ winnings_scoring_pct: pct })
        .eq("id", tournamentId);
      if (error) throw error;
      toast("Winnings % updated");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSavingId(null);
    }
  }

  if (tournaments.length === 0) {
    return (
      <div className="card" style={{ padding: 16, color: "var(--muted)", fontSize: 12 }}>
        No tournaments yet.
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 8 }}>
      {tournaments.map((t) => {
        const original = String(t.winnings_scoring_pct);
        const value = values[t.id] ?? original;
        const dirty = value !== original;
        return (
          <div key={t.id} className="tourney-pct-row">
            <div className="tourney-pct-name">
              <b>{t.name}</b>
              <small>
                {t.start_date} – {t.end_date}
                {t.is_major ? " · Major" : ""}
              </small>
            </div>
            <div className="tourney-pct-input">
              <input
                className="loginfield"
                type="number"
                step="0.1"
                min={0}
                value={value}
                onChange={(e) => setValues((v) => ({ ...v, [t.id]: e.target.value }))}
              />
              <span>%</span>
            </div>
            <button
              type="button"
              className="select"
              disabled={!dirty || savingId === t.id}
              onClick={() => save(t.id)}
            >
              {savingId === t.id ? "Saving…" : "Save"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
