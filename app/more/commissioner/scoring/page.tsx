import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getScoringSettings, getTournaments } from "@/lib/data";
import { ScoringSettingsForm } from "@/components/ScoringSettingsForm";
import { TournamentScoringForm } from "@/components/TournamentScoringForm";

export default async function ScoringSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/more/commissioner/scoring");
  if (!profile.is_admin) redirect("/more");

  const [settings, tournaments] = await Promise.all([getScoringSettings(), getTournaments()]);

  return (
    <section id="scoring-settings" className="screen active">
      <div className="pagehead">
        <Link href="/more/commissioner" className="back">
          ‹
        </Link>
        <h1>Scoring Settings</h1>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 10px" }}>
        Set how many points each hole result is worth, or switch off any rule entirely without
        losing its number. Changes apply to every tournament going forward.
      </p>
      <ScoringSettingsForm initial={settings as any} />

      <div className="section-label" style={{ marginTop: 18 }}>
        WINNINGS % PER TOURNAMENT
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 10px" }}>
        Each tournament keeps its own winnings percentage. Changing one week&rsquo;s number only
        updates that week — every other tournament&rsquo;s percentage, including ones already
        scored, stays exactly as it was.
      </p>
      <TournamentScoringForm tournaments={tournaments} />
    </section>
  );
}
