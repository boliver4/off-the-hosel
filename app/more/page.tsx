import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

export default async function MorePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/more");

  return (
    <section id="more" className="screen active">
      <div className="pagehead">
        <Link href="/" className="back">
          ‹
        </Link>
        <h1>More</h1>
      </div>

      <div className="card" style={{ marginBottom: 10 }}>
        <div className="bigrow">
          <div className="meta">
            <b>{profile.display_name}</b>
            <small>{profile.is_admin ? "Commissioner" : "League Member"}</small>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="bigrow">
          <div className="meta">
            <b>League Settings</b>
            <small>Off The Hosel — Masters-inspired, one entry per player.</small>
          </div>
        </div>
        <div className="bigrow">
          <div className="meta">
            <b>Scoring Rules</b>
            <small>
              Fantasy points = winnings × tournament scoring % (0 pts on a missed cut). See How It Works
              for details.
            </small>
          </div>
        </div>
        <div className="bigrow">
          <div className="meta">
            <b>Payouts</b>
            <small>Set by your commissioner each season.</small>
          </div>
        </div>
        {profile.is_admin && (
          <div className="bigrow">
            <div className="meta">
              <b>Commissioner Tools</b>
              <small>Enter results, manage golfers and tournaments.</small>
            </div>
            <Link href="/more/commissioner" className="select">
              OPEN
            </Link>
          </div>
        )}
        <div className="bigrow">
          <div className="meta">
            <b>Log Out</b>
            <small>Sign out of Off The Hosel.</small>
          </div>
          <SignOutButton />
        </div>
      </div>
    </section>
  );
}
