import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getFeaturedMajor, getGolfersWithSalaries, getMajorLineup } from "@/lib/data";
import { MajorChallengeClient } from "@/components/MajorChallengeClient";

export default async function MajorChallengePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/major-challenge");

  const tournament = await getFeaturedMajor();
  const salaries = tournament ? await getGolfersWithSalaries(tournament.id) : [];
  const lineup = tournament ? await getMajorLineup(profile.id, tournament.id) : null;
  const initialIds = ((lineup as any)?.major_lineup_golfers ?? []).map((g: any) => g.golfer_id);

  return (
    <section id="major" className="screen active">
      <div className="pagehead">
        <Link href="/" className="back">
          ‹
        </Link>
        <h1>Major Challenge</h1>
      </div>

      {!tournament ? (
        <div className="card" style={{ padding: 16 }}>
          No major on the schedule yet. Check back once your commissioner adds one.
        </div>
      ) : (
        <>
          <div className="tabs">
            <button className="tab active">Build Lineup</button>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 10px" }}>{tournament.name}</p>
          <MajorChallengeClient
            tournamentId={tournament.id}
            golferSalaries={salaries as any}
            initialLineupGolferIds={initialIds}
            userId={profile.id}
          />
        </>
      )}
    </section>
  );
}
