"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import type { ScoringSettings } from "@/lib/scoring";

type Rule = {
  key: keyof ScoringSettings & string;
  enabledKey: keyof ScoringSettings & string;
  label: string;
  hint: string;
};

const RULES: Rule[] = [
  { key: "par_pts", enabledKey: "par_enabled", label: "Par", hint: "per hole" },
  { key: "birdie_pts", enabledKey: "birdie_enabled", label: "Birdie", hint: "per hole" },
  { key: "eagle_pts", enabledKey: "eagle_enabled", label: "Eagle", hint: "per hole" },
  { key: "better_eagle_pts", enabledKey: "better_eagle_enabled", label: "Better than eagle", hint: "per hole" },
  { key: "bogey_pts", enabledKey: "bogey_enabled", label: "Bogey", hint: "per hole" },
  { key: "double_bogey_pts", enabledKey: "double_bogey_enabled", label: "Double bogey", hint: "per hole" },
  {
    key: "worse_double_pts",
    enabledKey: "worse_double_enabled",
    label: "Worse than double bogey",
    hint: "per hole",
  },
  { key: "bogey_free_pts", enabledKey: "bogey_free_enabled", label: "Bogey-free round", hint: "per round" },
  { key: "missed_cut_pts", enabledKey: "missed_cut_enabled", label: "Missed cut", hint: "penalty" },
];

export function ScoringSettingsForm({ initial }: { initial: ScoringSettings }) {
  const [settings, setSettings] = useState<ScoringSettings>(initial);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  function setPts(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value === "" ? 0 : Number(value) }));
  }

  function toggle(key: string) {
    setSettings((s) => ({ ...s, [key]: !(s as any)[key] }));
  }

  async function save() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("scoring_settings") as any).upsert(
        { id: 1, ...settings },
        { onConflict: "id" }
      );
      if (error) throw error;
      toast("Scoring settings saved");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't save scoring settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      {RULES.map((rule) => {
        const enabled = (settings as any)[rule.enabledKey] as boolean;
        const value = (settings as any)[rule.key] as number;
        return (
          <div key={rule.key} className="scoring-rule-row">
            <label className="scoring-rule-toggle">
              <input type="checkbox" checked={enabled} onChange={() => toggle(rule.enabledKey)} />
            </label>
            <div className="scoring-rule-label">
              <b>{rule.label}</b>
              <small>{rule.hint}</small>
            </div>
            <input
              className="loginfield scoring-rule-input"
              type="number"
              step="0.5"
              value={value}
              disabled={!enabled}
              onChange={(e) => setPts(rule.key, e.target.value)}
            />
          </div>
        );
      })}

      <div className="scoring-rule-row">
        <label className="scoring-rule-toggle">
          <input
            type="checkbox"
            checked={settings.winnings_pct_enabled}
            onChange={() => toggle("winnings_pct_enabled")}
          />
        </label>
        <div className="scoring-rule-label">
          <b>% of money won</b>
          <small>uses each tournament&rsquo;s scoring % (set on the tournament itself)</small>
        </div>
      </div>

      <button className="submit" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save Scoring Settings"}
      </button>
    </div>
  );
}
