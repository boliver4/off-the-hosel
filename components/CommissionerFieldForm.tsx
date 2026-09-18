"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { GolferAvatar } from "@/components/GolferAvatar";
import type { Golfer, Tournament } from "@/lib/data";

/**
 * Lets a commissioner mark which golfers are actually playing in a given
 * tournament. The One & Done picker only shows golfers checked here; if
 * nothing's ever been saved for a tournament, the picker falls back to
 * showing every golfer in the pool (see lib/data.ts getTournamentField).
 */
export function CommissionerFieldForm({ tournaments, golfers }: { tournaments: Tournament[]; golfers: Golfer[] }) {
  const [tournamentId, setTournamentId] = useState(tournaments[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const toast = useToast();

  async function loadSaved() {
    if (!tournamentId) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("tournament_field").select("golfer_id").eq("tournament_id", tournamentId);
    if (!error && data) {
      setSelected(new Set((data as any[]).map((r) => r.golfer_id)));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("tournament_field").select("golfer_id").eq("tournament_id", tournamentId);
      if (!cancelled) {
        if (!error && data) {
          setSelected(new Set((data as any[]).map((r) => r.golfer_id)));
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  async function autoLoadField() {
    if (!tournamentId) return;
    setAutoLoading(true);
    try {
      const res = await fetch("/api/sync-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data?.error || "Couldn't auto-load the field");
      } else {
        toast(`Loaded ${data.matched} of ${data.total} live field golfers into your pool`);
        await loadSaved();
      }
    } catch {
      toast("Couldn't reach live scoring");
    } finally {
      setAutoLoading(false);
    }
  }

  const filtered = useMemo(
    () => golfers.filter((g) => g.name.toLowerCase().includes(query.toLowerCase())),
    [golfers, query]
  );

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (!tournamentId) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("tournament_field").delete().eq("tournament_id", tournamentId);
      if (deleteError) throw deleteError;

      if (selected.size > 0) {
        const rows = Array.from(selected).map((golfer_id) => ({ tournament_id: tournamentId, golfer_id }));
        const { error: insertError } = await (supabase.from("tournament_field") as any).insert(rows);
        if (insertError) throw insertError;
      }
      toast(`Field saved: ${selected.size} golfer${selected.size === 1 ? "" : "s"}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't save the field");
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
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <div className="sync-all-box">
        <div className="sync-all-copy">
          <b>Auto-load field from live data</b>
          <small>
            Pulls this tournament&rsquo;s actual entry list straight from live scoring and checks off
            every matching golfer in your pool for you &mdash; no need to hand-pick from ~200 names. Safe
            to run again any time (this week&rsquo;s field can change up until tee time); it replaces
            whatever was saved before. Review the list below and hit Save Field when it looks right.
          </small>
        </div>
        <button type="button" className="sync-all-btn" disabled={autoLoading || !tournamentId} onClick={autoLoadField}>
          {autoLoading ? "Loading…" : "Auto-load Field"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <small style={{ color: "var(--muted)" }}>
          {selected.size} of {golfers.length} selected
        </small>
        <button
          type="button"
          className="select"
          style={{ marginLeft: "auto" }}
          onClick={() => setSelected(new Set(golfers.map((g) => g.id)))}
        >
          Select All
        </button>
        <button type="button" className="select used" onClick={() => setSelected(new Set())}>
          Clear All
        </button>
      </div>

      <div className="search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15 15 5 5" />
        </svg>
        <input placeholder="Search golfers..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="card" style={{ maxHeight: 420, overflowY: "auto" }}>
        {loading ? (
          <div className="bigrow">
            <div className="meta">
              <small>Loading current field&hellip;</small>
            </div>
          </div>
        ) : (
          filtered.map((g) => {
            const checked = selected.has(g.id);
            return (
              <label className="bigrow" key={g.id} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(g.id)}
                  style={{ width: 18, height: 18, marginRight: 2 }}
                />
                <GolferAvatar name={g.name} photoUrl={g.headshot_url} size={36} />
                <div className="meta">
                  <b>{g.name}</b>
                  <small>{g.world_rank ? `World Rank #${g.world_rank}` : "Unranked"}</small>
                </div>
              </label>
            );
          })
        )}
      </div>

      <button className="submit" disabled={saving || loading || !tournamentId} onClick={save}>
        {saving ? "Saving…" : "Save Field"}
      </button>
    </div>
  );
}
