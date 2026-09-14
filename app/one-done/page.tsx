import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import {
  getFeaturedTournament,
  getGolfers,
  getPickForTournament,
  getTournamentField,
  getUsedGolferIds,
} from "@/lib/data";
import { OneDoneClient } from "@/components/OneDoneClient";

export default async function OneDonePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/one-done");

  const tournament = await getFeaturedTournament();
  const [fieldGolfers, allGolfers, usedGolferIds] = await Promise.all([
    tournament ? getTournamentField(tournament.id) : Promise.resolve([]),
    getGolfers(),
    getUsedGolferIds(profile.id),
  ]);
  // Only show the tournament's actual field once a commissioner has set
  // one; fall back to the full golfer pool otherwise.
  const golfers = fieldGolfers.length > 0 ? fieldGolfers : allGolfers;

  const currentPick = tournament ? await getPickForTournament(profile.id, tournament.id) : null;

  return (
    <section id="one" className="screen active">
      <div className="pagehead">
        <Link href="/" className="back">
          ‹
        </Link>
        <h1>One &amp; Done</h1>
      </div>
      <div className="tabs">
        <button className="tab active">Make Pick</button>
        <Link href="/standings" className="tab">
          Standings
        </Link>
        <Link href="/my-picks" className="tab">
          My Picks
        </Link>
      </div>
      <OneDoneClient
        golfers={golfers}
        tournament={tournament}
        usedGolferIds={usedGolferIds}
        currentPickGolferId={(currentPick as any)?.golfer_id ?? null}
        userId={profile.id}
      />
    </section>
  );
}
