import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getUserPicksWithDetails } from "@/lib/data";
import { formatPoints } from "@/lib/scoring";

export default async function MyPicksPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/my-picks");

  const picks = await getUserPicksWithDetails(profile.id);

  return (
    <section id="mypicks" className="screen active">
      <div className="pagehead">
        <Link href="/" className="back">
          ‹
        </Link>
        <h1>My Picks</h1>
      </div>
      <div className="card" id="pickList">
        {picks.length === 0 ? (
          <div className="bigrow">
            <div className="meta">
              <b>No picks yet</b>
              <small>Head to One &amp; Done to make your first pick.</small>
            </div>
          </div>
        ) : (
          picks.map((pick: any) => (
            <div className="bigrow" key={pick.id}>
              <div className="meta">
                <b>{pick.golfers?.name}</b>
                <small>
                  {pick.tournaments?.name}
                  {pick.made_cut === false ? " • Missed Cut" : ""}
                </small>
              </div>
              <b>{formatPoints(pick.points)} pts</b>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
