"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import type { Tournament } from "@/lib/data";

/**
 * Lets a commissioner pin which tournament shows as "current" on the
 * dashboard/leaderboard (overriding the automatic nearest-by-date pick),
 * and assign each tournament to a free-text season segment for
 * segment-scoped standings. Both save independently, per row.
 */
export function TournamentSettingsForm({ tournaments }: { tournaments: Tournament[] }) {
  const [segments, setSegments] = useState<Record<string, string>>(
    Object.fromEntries(tournaments.map((t) => [t.id, t.segment ?? ""]))
  );
  const [savingSegmentId, setSavingSegmentId] = useState<string | null>(null);
  const [settingFeaturedId, setSettingFeaturedId] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const existingSegments = Array.from(new Set(tournaments.map((t) => t.segment).filter(Boolean))) as string[];

  async function saveSegment(tournamentId: string) {
    setSavingSegmentId(tournamentId);
    try {
      const supabase = createClient();
      const value = segments[tournamentId]?.trim() || null;
      const { error } = await (supabase.from("tournaments") as any)
        .update({ segment: value })
        .eq("id", tournamentId);
      if (error) throw error;
      toast(value ? `Assigned to "${value}"` : "Removed from segment");
      router.refresh();
    } catch (err) {
      toast((err as any)?.message || (err instanceof Error ? err.message : "Couldn't save segment"));
    } finally {
      setSavingSegmentId(null);
    }
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

  return (
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

      <datalist id="segment-options">
        {existingSegments.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {tournaments.map((t) => {
        const segOriginal = t.segment ?? "";
        const segValue = segments[t.id] ?? segOriginal;
        const segDirty = segValue.trim() !== segOriginal;
        return (
          <div key={t.id} className="tourney-settings-row">
            <div className="tourney-pct-name">
              <b>
                {t.name}
                {t.is_featured ? <span className="tourney-current-badge">CURRENT</span> : null}
              </b>
              <small>
                {t.start_date} – {t.end_date}
                {t.is_major ? " · Major" : ""}
              </small>
            </div>

            <div className="tourney-settings-controls">
              <input
                className="loginfield"
                list="segment-options"
                placeholder="No segment"
                value={segValue}
                onChange={(e) => setSegments((v) => ({ ...v, [t.id]: e.target.value }))}
              />
              <button
                type="button"
                className="select"
                disabled={!segDirty || savingSegmentId === t.id}
                onClick={() => saveSegment(t.id)}
              >
                {savingSegmentId === t.id ? "Saving…" : "Save"}
              </button>
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
        );
      })}
    </div>
  );
}
