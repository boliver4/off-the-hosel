// Full-season test harness for Off The Hosel.
//
// Runs entirely against your REAL Supabase project (safe to do — see the
// "Does your production Supabase already have real members" question this
// was built for: nothing here touches real member data, and everything it
// creates is clearly labeled "TEST - <name>" and easy to remove afterward).
//
// What it does, end to end:
//   1. seed     Creates a handful of "TEST - <name>" league members.
//   2. fields   Auto-loads each tournament's field from live scoring (the
//               same syncTournamentField() the app's cron/button use) so
//               picks have a real, accurate field to choose from.
//   3. picks    Has each TEST member pick one golfer per tournament, in
//               date order, using a different (deterministic) strategy per
//               member so standings end up with real spread instead of
//               everyone tied.
//   4. results  Backfills REAL results for every tournament that's already
//               happened this season, straight from ESPN (the same
//               syncTournamentResults() the cron job/"Sync All" button
//               use) — this is genuine historical data, not fabricated.
//   5. report   Prints standings, segment standings, and a few sanity
//               checks so you can eyeball that everything computed right.
//   6. cleanup  Deletes the TEST accounts and everything tied to them
//               (their picks cascade-delete automatically). Leaves the
//               real tournament/results/field data in place, since that's
//               genuinely useful, accurate season data — not test noise.
//   7. run      Does 1-5 in order, in one shot (what "run a full season
//               test" means end to end).
//   8. status   Prints what's already in place, so you can tell what a
//               re-run will/won't touch.
//
// Usage (from the project root, with your real .env.local in place):
//   npx tsx scripts/season-test.ts run
//   npx tsx scripts/season-test.ts report
//   npx tsx scripts/season-test.ts cleanup
//
// Safe to re-run any step any time — seeding is idempotent (skips members
// that already exist), fields/results just re-sync, and picks skip any
// tournament a member already has a pick for.

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { syncTournamentField, syncTournamentResults } from "../lib/live-scores";

// --- env -------------------------------------------------------------
// Standalone script, so .env.local isn't auto-loaded the way Next does it.
function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Make sure .env.local has both set (Supabase project settings -> API)."
  );
  process.exit(1);
}

const supabase = createSupabaseClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- test-member roster ------------------------------------------------
// Each has a different pick strategy so standings end up with a real
// spread instead of everyone tied on the same golfers every week.
const TEST_MEMBERS = [
  { slug: "alice", name: "TEST - Alice (favorites)", strategy: "best" as const },
  { slug: "bo", name: "TEST - Bo (contrarian)", strategy: "worst" as const },
  { slug: "cara", name: "TEST - Cara (random A)", strategy: "random" as const, seed: 1 },
  { slug: "deshawn", name: "TEST - Deshawn (random B)", strategy: "random" as const, seed: 2 },
  { slug: "emi", name: "TEST - Emi (random C)", strategy: "random" as const, seed: 3 },
];
const TEST_EMAIL_DOMAIN = "offthehosel.invalid"; // reserved TLD, guaranteed never real (RFC 2606)

function log(...args: any[]) {
  console.log(...args);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Small deterministic RNG so "random" strategies are reproducible run to run.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function getTournaments() {
  const { data, error } = await supabase.from("tournaments").select("*").order("start_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function getTestProfiles(): Promise<{ id: string; display_name: string }[]> {
  const { data, error } = await supabase.from("profiles").select("id,display_name").ilike("display_name", "TEST - %");
  if (error) throw error;
  return data ?? [];
}

// --- step: seed ----------------------------------------------------------
async function seed() {
  log(`Seeding ${TEST_MEMBERS.length} test members...`);
  for (const m of TEST_MEMBERS) {
    const email = `test.${m.slug}@${TEST_EMAIL_DOMAIN}`;
    const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const already = existing?.users?.find((u: any) => u.email === email);
    if (already) {
      log(`  ${m.name} — already exists, skipping`);
      continue;
    }
    const { error } = await supabase.auth.admin.createUser({
      email,
      password: `TestPass!${Math.random().toString(36).slice(2, 10)}`,
      email_confirm: true,
      user_metadata: { display_name: m.name },
    });
    if (error) {
      log(`  ${m.name} — FAILED: ${error.message}`);
    } else {
      log(`  ${m.name} — created`);
    }
  }
}

// --- step: fields ----------------------------------------------------------
async function fields() {
  const tournaments = await getTournaments();
  log(`Loading fields for ${tournaments.length} tournaments from live scoring...`);
  for (const t of tournaments) {
    const result = await syncTournamentField(supabase, (t as any).id);
    if (result.error) {
      log(`  ${(t as any).name} — ${result.error}`);
    } else {
      log(`  ${(t as any).name} — ${result.matched}/${result.total} golfers matched`);
    }
    await sleep(300);
  }
}

// --- step: picks ----------------------------------------------------------
async function picks() {
  const tournaments = await getTournaments();
  const members = await getTestProfiles();
  if (members.length === 0) {
    log("No TEST members found — run `seed` first.");
    return;
  }
  log(`Assigning picks across ${tournaments.length} tournaments for ${members.length} members...`);

  const usedByUser = new Map<string, Set<string>>(members.map((m) => [m.id, new Set<string>()]));
  // Pre-load anything already picked (so re-runs don't clash with the
  // no-reuse trigger or try to overwrite existing picks).
  for (const m of members) {
    const { data } = await supabase.from("one_and_done_picks").select("tournament_id,golfer_id").eq("user_id", m.id);
    for (const row of (data as any[]) ?? []) {
      usedByUser.get(m.id)!.add(row.golfer_id);
    }
  }

  for (const t of tournaments) {
    const tournamentId = (t as any).id;
    let field: { id: string; world_rank: number | null }[] = [];
    const { data: fieldRows } = await supabase.from("tournament_field").select("golfers(id,world_rank)").eq("tournament_id", tournamentId);
    field = ((fieldRows as any[]) ?? []).map((r) => r.golfers).filter(Boolean);
    if (field.length === 0) {
      const { data: allGolfers } = await supabase.from("golfers").select("id,world_rank").eq("active", true);
      field = (allGolfers as any[]) ?? [];
    }
    if (field.length === 0) continue;

    for (const m of TEST_MEMBERS) {
      const profile = members.find((p) => p.display_name === m.name);
      if (!profile) continue;

      const { data: existingPick } = await supabase
        .from("one_and_done_picks")
        .select("id")
        .eq("user_id", profile.id)
        .eq("tournament_id", tournamentId)
        .maybeSingle();
      if (existingPick) continue;

      const used = usedByUser.get(profile.id)!;
      const available = field.filter((g) => !used.has(g.id));
      if (available.length === 0) {
        log(`  ${(t as any).name}: ${m.name} — no unused golfers left in field, skipping`);
        continue;
      }

      let choice: { id: string; world_rank: number | null };
      if (m.strategy === "best") {
        choice = [...available].sort((a, b) => (a.world_rank ?? 9999) - (b.world_rank ?? 9999))[0];
      } else if (m.strategy === "worst") {
        choice = [...available].sort((a, b) => (b.world_rank ?? 9999) - (a.world_rank ?? 9999))[0];
      } else {
        const rand = mulberry32((m.seed ?? 1) * 1000 + hashString((t as any).id));
        choice = available[Math.floor(rand() * available.length)];
      }

      const { error } = await supabase.from("one_and_done_picks").insert({
        user_id: profile.id,
        tournament_id: tournamentId,
        golfer_id: choice.id,
      } as any);
      if (error) {
        log(`  ${(t as any).name}: ${m.name} — FAILED (${error.message})`);
      } else {
        used.add(choice.id);
      }
    }
  }
  log("Picks assigned.");
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

// --- step: results ----------------------------------------------------------
async function results() {
  const tournaments = await getTournaments();
  const today = new Date().toISOString().slice(0, 10);
  const past = tournaments.filter((t: any) => t.start_date <= today);
  log(`Backfilling real results for ${past.length} completed tournaments from ESPN (this can take a while)...`);
  for (const t of past) {
    const result = await syncTournamentResults(supabase, (t as any).id);
    if (result.error) {
      log(`  ${(t as any).name} — ${result.error}`);
    } else if (result.reason) {
      log(`  ${(t as any).name} — ${result.reason}`);
    } else {
      log(`  ${(t as any).name} — synced ${result.synced}/${result.total} (${result.skipped} unmatched)`);
    }
    await sleep(400);
  }
}

// --- step: report ----------------------------------------------------------
async function report() {
  const members = await getTestProfiles();
  if (members.length === 0) {
    log("No TEST members found — run `seed` first.");
    return;
  }
  const memberIds = new Set(members.map((m) => m.id));

  const { data: standings } = await supabase
    .from("one_and_done_standings")
    .select("*")
    .order("total_points", { ascending: false });
  const testStandings = ((standings as any[]) ?? []).filter((s) => memberIds.has(s.user_id));

  log("\n=== Overall standings (TEST members only) ===");
  testStandings.forEach((s, i) => {
    log(`  ${i + 1}. ${s.display_name} — ${Math.round(s.total_points)} pts (${s.weeks_picked} weeks picked)`);
  });

  const { data: segStandings } = await supabase
    .from("one_and_done_standings_by_segment")
    .select("*")
    .order("segment", { ascending: true })
    .order("total_points", { ascending: false });
  const testSeg = ((segStandings as any[]) ?? []).filter((s) => memberIds.has(s.user_id));
  const bySegment = new Map<string, any[]>();
  for (const row of testSeg) {
    const list = bySegment.get(row.segment) ?? [];
    list.push(row);
    bySegment.set(row.segment, list);
  }
  if (bySegment.size > 0) {
    log("\n=== Segment standings (TEST members only) ===");
    for (const [segment, rows] of bySegment) {
      log(`  ${segment}:`);
      rows.forEach((s, i) => log(`    ${i + 1}. ${s.display_name} — ${Math.round(s.total_points)} pts`));
    }
  } else {
    log("\n(No segment standings yet — assign tournaments to segments in Tournament Settings to see this.)");
  }

  // Sanity checks
  log("\n=== Sanity checks ===");
  const tournaments = await getTournaments();
  for (const m of members) {
    const { data: picksData } = await supabase.from("one_and_done_picks").select("golfer_id").eq("user_id", m.id);
    const golferIds = ((picksData as any[]) ?? []).map((p) => p.golfer_id);
    const dupes = golferIds.length - new Set(golferIds).size;
    const flags: string[] = [];
    if (golferIds.length < tournaments.length) flags.push(`only ${golferIds.length}/${tournaments.length} weeks picked`);
    if (dupes > 0) flags.push(`${dupes} duplicate golfer picks (should be impossible — DB trigger should have blocked this)`);
    const standing = testStandings.find((s) => s.user_id === m.id);
    if (!standing || standing.total_points === 0) flags.push("zero total points — check that results were synced");
    log(`  ${m.display_name}: ${flags.length === 0 ? "OK" : flags.join("; ")}`);
  }
}

// --- step: cleanup ----------------------------------------------------------
async function cleanup() {
  const members = await getTestProfiles();
  if (members.length === 0) {
    log("No TEST members to clean up.");
    return;
  }
  log(`This will permanently delete ${members.length} TEST accounts and all their picks:`);
  members.forEach((m) => log(`  - ${m.display_name}`));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer: string = await new Promise((resolve) => rl.question('Type "DELETE" to confirm: ', resolve));
  rl.close();
  if (answer.trim() !== "DELETE") {
    log("Cancelled — nothing was deleted.");
    return;
  }
  for (const m of members) {
    const { error } = await supabase.auth.admin.deleteUser(m.id);
    if (error) log(`  ${m.display_name} — FAILED: ${error.message}`);
    else log(`  ${m.display_name} — deleted`);
  }
  log("Done. Real tournament/results/field data was left in place.");
}

// --- step: status ----------------------------------------------------------
async function status() {
  const tournaments = await getTournaments();
  const members = await getTestProfiles();
  const { count: fieldCount } = await supabase.from("tournament_field").select("tournament_id", { count: "exact", head: true });
  const { count: resultsCount } = await supabase.from("tournament_results").select("tournament_id", { count: "exact", head: true });
  const { count: pickCount } = members.length
    ? await supabase
        .from("one_and_done_picks")
        .select("id", { count: "exact", head: true })
        .in("user_id", members.map((m) => m.id))
    : { count: 0 };
  log(`Tournaments: ${tournaments.length}`);
  log(`TEST members: ${members.length} ${members.map((m) => m.display_name).join(", ")}`);
  log(`Field rows saved (any tournament): ${fieldCount ?? 0}`);
  log(`Result rows saved (any tournament): ${resultsCount ?? 0}`);
  log(`TEST member picks made: ${pickCount ?? 0} (of up to ${tournaments.length * TEST_MEMBERS.length} possible)`);
}

// --- entrypoint ----------------------------------------------------------
async function main() {
  const cmd = process.argv[2];
  switch (cmd) {
    case "seed":
      return seed();
    case "fields":
      return fields();
    case "picks":
      return picks();
    case "results":
      return results();
    case "report":
      return report();
    case "cleanup":
      return cleanup();
    case "status":
      return status();
    case "run":
      await seed();
      await fields();
      await picks();
      await results();
      await report();
      return;
    default:
      log(
        "Usage: npx tsx scripts/season-test.ts <seed|fields|picks|results|report|cleanup|status|run>\n" +
          "  run      Do everything in order (seed, fields, picks, results, report) — this is the one-shot season test.\n" +
          "  status   See what's already in place before running anything.\n" +
          "  cleanup  Remove the TEST accounts and their picks when you're done."
      );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
