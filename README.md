# Off The Hosel

Fantasy golf for a real, ~100-player league. Two games:

- **One & Done** — pick one golfer each week; once you've used a golfer you can't pick them again for the season.
- **Major Challenge** — for the four majors, build a 5-golfer lineup under a $50,000 salary cap.

Scoring: a pick's fantasy points = a percentage of the golfer's real tournament winnings ($) that week. That percentage is set per-tournament by the commissioner (so majors can be weighted higher). A missed cut scores 0. Results are entered manually by a commissioner after each event — there's no live stats integration.

Built with Next.js 14 (App Router, TypeScript) and Supabase (Auth + Postgres).

## Local setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy the env example and fill in your Supabase project credentials (Supabase dashboard → Project Settings → API):
   ```
   cp .env.local.example .env.local
   ```
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Set up the database: open your Supabase project's SQL editor and run the entire contents of `supabase/schema.sql`. This creates every table, view, RLS policy, and seeds the 2026 tournament schedule plus a starter golfer list.
4. To make yourself a commissioner (so you can enter results), sign up in the app first, then in the SQL editor run:
   ```sql
   update public.profiles set is_admin = true where id = '<your-user-id>';
   ```
   (find your user id in Authentication → Users).
5. Run the app:
   ```
   npm run dev
   ```

## Deploying

Push this repo to GitHub, then import it into Vercel. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings, then deploy. No other configuration is required — the build guards against missing Supabase env vars so it won't fail if they're added after the first deploy.

## What's wired to Supabase vs. still UI-only

- **Fully wired:** auth (email/password sign up & log in), One & Done pick submission (with server-enforced "can't reuse a golfer" via a DB trigger + unique constraint), My Picks, Live Leaderboard, Season Standings, Tournament Info, and the commissioner results-entry form — all read/write real Supabase data.
- **Wired but rougher:** Major Challenge lineup building/submission works end-to-end, but there's no dedicated Major standings screen yet beyond the home page placeholder — the `major_lineup_points` view is there for a future screen to use.
- **UI only / static copy:** League Settings and Payouts under More are placeholder text (no dedicated tables — add them if the league needs configurable payouts later). How It Works is static content.

## Project structure

```
app/                    App Router pages (one folder per route)
components/             Shared client components (header, nav, forms)
lib/                    Supabase clients, data-fetching helpers, scoring util, types
supabase/schema.sql     Full DB schema, RLS policies, and seed data
public/images/          Ported prototype imagery (course photos, logo, placeholder headshots)
```

## Known gaps / deliberate simplifications

- Real golfer headshots aren't sourced — `golfers.headshot_url` is nullable and the placeholder images from the original mockup live in `public/images/golfers/` if you want to reuse them.
- The prototype's "2026 Test Mode" season-replay simulator (client-side, localStorage-based) was dropped rather than ported — it was dev/demo tooling, not part of the real product.
- Course-level historical analytics per golfer isn't built yet, but the schema supports it: `tournament_results` is keyed by `tournament_id`, and `tournaments.course` carries the course name, so a "how has this golfer done at this course" query is a straightforward join away.
