import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getGolfers, getTournaments } from "@/lib/data";
import { CommissionerResultsForm } from "@/components/CommissionerResultsForm";

export default async function CommissionerPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/more/commissioner");
  if (!profile.is_admin) redirect("/more");

  const [tournaments, golfers] = await Promise.all([getTournaments(), getGolfers()]);

  return (
    <section id="commissioner" className="screen active">
      <div className="pagehead">
        <Link href="/more" className="back">
          ‹
        </Link>
        <h1>Commissioner Tools</h1>
      </div>

      <div className="card" style={{ marginBottom: 10 }}>
        <div className="bigrow">
          <div className="meta">
            <b>Tournament Field</b>
            <small>Pick which golfers are playing each week.</small>
          </div>
          <Link href="/more/commissioner/field" className="select">
            OPEN
          </Link>
        </div>
      </div>

      <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 10px" }}>
        Enter each golfer&rsquo;s official winnings after a tournament wraps. Points are calculated
        automatically for everyone who picked them that week.
      </p>

      {tournaments.length === 0 || golfers.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>
          Add tournaments and golfers in Supabase before entering results.
        </div>
      ) : (
        <CommissionerResultsForm tournaments={tournaments} golfers={golfers} />
      )}
    </section>
  );
}
