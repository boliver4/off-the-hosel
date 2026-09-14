"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { MAJOR_CHALLENGE_ROSTER_SIZE, MAJOR_CHALLENGE_SALARY_CAP } from "@/lib/scoring";

type SalaryRow = {
  golfer_id: string;
  salary: number;
  golfers: { id: string; name: string; world_rank: number | null } | null;
};

export function MajorChallengeClient({
  tournamentId,
  golferSalaries,
  initialLineupGolferIds,
  userId,
}: {
  tournamentId: string;
  golferSalaries: SalaryRow[];
  initialLineupGolferIds: string[];
  userId: string;
}) {
  const [lineup, setLineup] = useState<string[]>(initialLineupGolferIds);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const byId = useMemo(() => new Map(golferSalaries.map((g) => [g.golfer_id, g])), [golferSalaries]);
  const spent = lineup.reduce((sum, id) => sum + (byId.get(id)?.salary ?? 0), 0);
  const remaining = MAJOR_CHALLENGE_SALARY_CAP - spent;
  const canSubmit = lineup.length === MAJOR_CHALLENGE_ROSTER_SIZE && spent <= MAJOR_CHALLENGE_SALARY_CAP;

  function addGolfer(id: string) {
    if (lineup.includes(id)) return toast("Already in lineup");
    if (lineup.length >= MAJOR_CHALLENGE_ROSTER_SIZE) return toast("Lineup is full");
    const salary = byId.get(id)?.salary ?? 0;
    if (spent + salary > MAJOR_CHALLENGE_SALARY_CAP) return toast("Over salary cap");
    setLineup((l) => [...l, id]);
  }

  function removeGolfer(id: string) {
    setLineup((l) => l.filter((x) => x !== id));
  }

  async function submitLineup() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: lineupRow, error: lineupError } = await supabase
        .from("major_lineups")
        .upsert({ user_id: userId, tournament_id: tournamentId }, { onConflict: "user_id,tournament_id" })
        .select()
        .single();
      if (lineupError) throw lineupError;

      await supabase.from("major_lineup_golfers").delete().eq("lineup_id", lineupRow.id);
      const rows = lineup.map((golfer_id) => ({
        lineup_id: lineupRow.id,
        golfer_id,
        salary_at_pick: byId.get(golfer_id)?.salary ?? 0,
      }));
      const { error: golfersError } = await supabase.from("major_lineup_golfers").insert(rows);
      if (golfersError) throw golfersError;

      toast("Lineup submitted");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't submit lineup");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="cap">
        <div>
          <small>SALARY CAP</small>
          <b>${MAJOR_CHALLENGE_SALARY_CAP.toLocaleString()}</b>
        </div>
        <div style={{ textAlign: "right" }}>
          <small>REMAINING</small>
          <b>${remaining.toLocaleString()}</b>
        </div>
      </div>

      <div className="card" id="majorList">
        {golferSalaries.length === 0 && (
          <div className="bigrow">
            <div className="meta">
              <b>No salaries set for this major yet</b>
              <small>A commissioner needs to add golfer salaries in Supabase.</small>
            </div>
          </div>
        )}
        {golferSalaries.map((g) => (
          <div className="bigrow" key={g.golfer_id}>
            <div className="meta">
              <b>{g.golfers?.name}</b>
              <small>${g.salary.toLocaleString()}</small>
            </div>
            <button className="select" disabled={saving} onClick={() => addGolfer(g.golfer_id)}>
              ADD
            </button>
          </div>
        ))}
      </div>

      <div className="card lineup" id="lineup">
        {lineup.length === 0 ? (
          <div className="bigrow">
            <div className="meta">
              <b>No golfers selected</b>
              <small>Add 5 golfers under the $50,000 cap.</small>
            </div>
          </div>
        ) : (
          lineup.map((id) => (
            <div className="bigrow" key={id}>
              <div className="meta">
                <b>{byId.get(id)?.golfers?.name}</b>
                <small>${(byId.get(id)?.salary ?? 0).toLocaleString()}</small>
              </div>
              <button className="remove" onClick={() => removeGolfer(id)}>
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <button className="submit" disabled={!canSubmit || saving} onClick={submitLineup}>
        {saving ? "Saving…" : "Submit Lineup"}
      </button>
    </>
  );
}
