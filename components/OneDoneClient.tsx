"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import type { Golfer, Tournament } from "@/lib/data";

export function OneDoneClient({
  golfers,
  tournament,
  usedGolferIds,
  currentPickGolferId,
  userId,
}: {
  golfers: Golfer[];
  tournament: Tournament | null;
  usedGolferIds: string[];
  currentPickGolferId: string | null;
  userId: string;
}) {
  const [query, setQuery] = useState("");
  const [pickId, setPickId] = useState(currentPickGolferId);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const usedSet = useMemo(() => new Set(usedGolferIds), [usedGolferIds]);

  const filtered = golfers.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));

  async function pickOne(golferId: string) {
    if (!tournament) return;
    if (usedSet.has(golferId) && golferId !== currentPickGolferId) return;

    setSaving(true);
    try {
      const supabase = createClient();
      // Cast to `any`: the Supabase-generated Database type doesn't infer
      // this table's Insert type correctly through the upsert() overload
      // (a known quirk), even though the shape below matches the schema.
      const { error } = await (supabase
        .from("one_and_done_picks") as any)
        .upsert(
          { user_id: userId, tournament_id: tournament.id, golfer_id: golferId },
          { onConflict: "user_id,tournament_id" }
        );
      if (error) throw error;
      setPickId(golferId);
      toast(`${golfers.find((g) => g.id === golferId)?.name} selected`);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't save your pick");
    } finally {
      setSaving(false);
    }
  }

  if (!tournament) {
    return <div className="card" style={{ padding: 16 }}>No upcoming tournament to pick for yet.</div>;
  }

  return (
    <>
      <div className="search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15 15 5 5" />
        </svg>
        <input placeholder="Search golfers..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="card" id="oneList">
        {filtered.length === 0 && (
          <div className="bigrow">
            <div className="meta">
              <b>No golfers found</b>
              <small>Try a different search, or ask your commissioner to add golfers.</small>
            </div>
          </div>
        )}
        {filtered.map((g) => {
          const used = usedSet.has(g.id) && g.id !== currentPickGolferId;
          const selected = pickId === g.id;
          return (
            <div className="bigrow" key={g.id}>
              <div className="meta">
                <b>{g.name}</b>
                <small>{g.world_rank ? `World Rank #${g.world_rank}` : "Unranked"}</small>
              </div>
              <button
                className={"select" + (used ? " used" : "")}
                disabled={used || saving}
                onClick={() => pickOne(g.id)}
              >
                {selected ? "SELECTED" : used ? "USED" : "SELECT"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}