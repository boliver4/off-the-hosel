import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getTournaments } from "@/lib/data";
import { TournamentSettingsForm } from "@/components/TournamentSettingsForm";

export default async function TournamentSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/more/commissioner/tournaments");
  if (!profile.is_admin) redirect("/more");

  const tournaments = await getTournaments();

  return (
    <section id="tournament-settings" className="screen active">
      <div className="pagehead">
        <Link href="/more/commissioner" className="back">
          ‹
        </Link>
        <h1>Tournament Settings</h1>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 10px" }}>
        Pin which tournament shows as &ldquo;current&rdquo; on the dashboard and leaderboard, and
        assign each tournament to a season segment for segment standings.
      </p>
      <TournamentSettingsForm tournaments={tournaments} />
    </section>
  );
}
