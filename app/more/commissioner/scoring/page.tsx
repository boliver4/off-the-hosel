import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getScoringSettings } from "@/lib/data";
import { ScoringSettingsForm } from "@/components/ScoringSettingsForm";

export default async function ScoringSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/more/commissioner/scoring");
  if (!profile.is_admin) redirect("/more");

  const settings = await getScoringSettings();

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
    </section>
  );
}
