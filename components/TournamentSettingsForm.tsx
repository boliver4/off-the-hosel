"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import type { Tournament } from "@/lib/data";

const DEFAULT_SEGMENTS = ["Q1", "Q2", "Q3", "Q4"];

/**
 * Lets a commissioner pin which tournament shows as "current" on the
 * dashboard/leaderboard (overriding the automatic nearest-by-date pick),
 * and build out season segments by picking a segment first, then checking
 * off every tournament that belongs in it — one save per checkbox, no
 * typing/misspelling a segment name per tournament. Standings automatically
 * pick up whatever's assigned here (see one_and_done_standings_by_segment),
 * and the Standings page auto-badges whichever segment the current
 * tournament falls in — nothing else to wire up by hand.
 */
export function TournamentSettingsForm({ tournaments }: { tournaments: Tournament[] }) {
  // Local optimistic copy of each tournament's segment, so checking a box
  // updates the UI instantly instead of waiting on a round trip + refresh.
  const [segmentByTournament, setSegmentByTournament] = useState<Record<string, string | null>>(
    Object.fromEntries(tournaments.map((t) => [t.id, t.segment ?? null]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [settingFeaturedId, setSettingFeaturedId] = useState<string | null>(null);
  const [newSegmentDraft, setNewSegmentDraft] = useState("");
  const [addingSegment, setAddingSegment] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const knownSegments = useMemo(() => {
    const fromData = Array.from(new Set(Object.values(segmentByTournament).filter(Boolean))) as string[];
    const merged = Array.from(new Set([...DEFAULT_SEGMENTS, ...fromData]));
    return merged.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [segmentByTournament]);

  const [selectedSegment, setSelectedSegment] = useState(knownSegments[0] ?? "Q1");

  async function assign(tournamentId: string, segment: string | null) {
    const prev = segmentByTournament[tournamentId] ?? null;
    setSegmentByTournament((m) => ({ ...m, [tournamentId]: segment }));
    setSavingId(tournamentId);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("tournaments") as any).update({ segment }).eq("id", tournamentId);
      if (error) throw error;
    } catch (err) {
      setSegmentByTournament((m) => ({ ...m, [tournamentId]: prev }));
      toast((err as any)?.message || (err instanceof Error ? err.message : "Couldn't save segment"));
    } finally {
      setSavingId(null);
    }
  }

  function toggle(tournamentId: string) {
    const current = segmentByTournament[tournamentId] ?? null;
    assign(tournamentId, current === selectedSegment ? null : selectedSegment);
  }

  function addSegment() {
    const name = newSegmentDraft.trim();
    if (!name) {
      setAddingSegment(false);
      return;
    }
    setSelectedSegment(name);
    setNewSegmentDraft("");
    setAddingSegment(false);
    // Nothing to save yet — a new segment only really exists once a
    // tournament is checked into it; it'll show up in knownSegments as soon
    // as that happens. Selecting it now just gets the commissioner there.
  }

  async function setFeatured(tournamentId: string) {
    setSettingFeaturedId(tournamentId);
    try {
      const supabase = createClient();
      // Two-step so it works under the DB's "at most one featured" unique
      // index regardless of which row currently holds it: clear every
      // featured flag first, then set only the chosen one.
      const { error: clearError } = await (supabase.from("tournaments") as any)
        .update({ is_featured: false })
        .eq("is_featured", true);
      if (clearError) throw clearError;
      const { error: setError } = await (supabase.from("tournaments") as any)
        .update({ is_featured: true })
        .eq("id", tournamentId);
      if (setError) throw setError;
      toast("Set as current tournament");
      router.refresh();
    } catch (err) {
      toast((err as any)?.message || (err instanceof Error ? err.message : "Couldn't set current tournament"));
    } finally {
      setSettingFeaturedId(null);
    }
  }

  async function clearFeatured() {
    setSettingFeaturedId("__clear__");
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("tournaments") as any).update({ is_featured: false }).eq("is_featured", true);
      if (error) throw error;
      toast("Back to automatic (nearest by date)");
      router.refresh();
    } catch (err) {
      toast((err as any)?.message || (err instanceof Error ? err.message : "Couldn't clear"));
    } finally {
      setSettingFeaturedId(null);
    }
  }

  if (tournaments.length === 0) {
    return (
      <div className="card" style={{ padding: 16, color: "var(--muted)", fontSize: 12 }}>
        No tournaments yet.
      </div>
    );
  }

  const anyFeatured = tournaments.some((t) => t.is_featured);
  const segmentCount = tournaments.filter((t) => (segmentByTournament[t.id] ?? null) === selectedSegment).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="card" style={{ padding: 8 }}>
        <div className="bigrow" style={{ borderTop: 0 }}>
          <div className="meta">
            <b>Current tournament</b>
            <small>{anyFeatured ? "Manually pinned below" : "Automatic — nearest tournament by date"}</small>
          </div>
          {anyFeatured ? (
            <button type="button" className="select" disabled={settingFeaturedId !== null} onClick={clearFeatured}>
              {settingFeaturedId === "__clear__" ? "Clearing…" : "Use Automatic"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <b>Segments</b>
        <small style={{ color: "var(--muted)", marginTop: -6 }}>
          Pick a segment, then check off every tournament that belongs in it. Standings, the segment
          badge, and everything else update on their own from here — nothing else to set up.
        </small>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {knownSegments.map((seg) => (
            <button
              key={seg}
              type="button"
              className={seg === selectedSegment ? "tab-pill active" : "tab-pill"}
              onClick={() => setSelectedSegment(seg)}
            >
              {seg}
            </button>
          ))}
          {addingSegment ? (
            <input
              autoFocus
              className="loginfield"
              style={{ width: 110, fontSize: 12 }}
              placeholder="Segment name"
              value={newSegmentDraft}
              onChange={(e) => setNewSegmentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addSegment();
                if (e.key === "Escape") {
                  setAddingSegment(false);
                  setNewSegmentDraft("");
                }
              }}
              onBlur={addSegment}
            />
          ) : (
            <button type="button" className="tab-pill" onClick={() => setAddingSegment(true)}>
              + New
            </button>
          )}
        </div>

        <small style={{ color: "var(--muted)" }}>
          {segmentCount} tournament{segmentCount === 1 ? "" : "s"} in {selectedSegment}
        </small>

        <div className="card" style={{ maxHeight: 420, overflowY: "auto" }}>
          {tournaments.map((t) => {
            const checked = (segmentByTournament[t.id] ?? null) === selectedSegment;
            return (
              <label className="bigrow" key={t.id} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={savingId === t.id}
                  onChange={() => toggle(t.id)}
                  style={{ width: 18, height: 18, marginRight: 2 }}
                />
                <div className="meta">
                  <b>{t.name}</b>
                  <small>
                    {t.start_date} – {t.end_date}
                    {t.is_major ? " · Major" : ""}
                    {segmentByTournament[t.id] && !checked ? ` · currently in ${segmentByTournament[t.id]}` : ""}
                  </small>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ padding: 8 }}>
        {tournaments.map((t) => (
          <div key={t.id} className="tourney-settings-row">
            <div className="tourney-pct-name">
              <b>
                {t.name}
                {t.is_featured ? <span className="tourney-current-badge">CURRENT</span> : null}
                {segmentByTournament[t.id] ? <span className="tourney-current-badge tourney-segment-badge">{segmentByTournament[t.id]}</span> : null}
              </b>
              <small>
                {t.start_date} – {t.end_date}
                {t.is_major ? " · Major" : ""}
              </small>
            </div>
            <div className="tourney-settings-controls" style={{ gridTemplateColumns: "auto" }}>
              <button
                type="button"
                className="select"
                disabled={t.is_featured || settingFeaturedId !== null}
                onClick={() => setFeatured(t.id)}
              >
                {settingFeaturedId === t.id ? "Setting…" : t.is_featured ? "Current" : "Set as Current"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
