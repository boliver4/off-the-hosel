import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getGolfers, getTournaments } from "@/lib/data";
import { CommissionerFieldForm } from "@/components/CommissionerFieldForm";

export default async function CommissionerFieldPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/more/commissioner/field");
  if (!profile.is_admin) redirect("/more");

  const [tournaments, golfers] = await Promise.all([getTournaments(), getGolfers()]);

  return (
    <section id="commissioner-field" className="screen active">
      <div className="pagehead">
        <Link href="/more/commissioner" className="back">
          ‹
        </Link>
        <h1>Tournament Field</h1>
      </div>

      <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 10px" }}>
        Check off which golfers are actually playing each tournament. The One &amp; Done picker will
        only show golfers checked here — if you haven&rsquo;t set a field yet for a tournament, it shows
        every golfer in the pool instead.
      </p>

      {tournaments.length === 0 || golfers.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>
          Add tournaments and golfers in Supabase before setting a field.
        </div>
      ) : (
        <CommissionerFieldForm tournaments={tournaments} golfers={golfers} />
      )}
    </section>
  );
}
