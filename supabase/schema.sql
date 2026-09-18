-- Off The Hosel — schema.sql
-- Run this whole file once against your Supabase project's SQL editor
-- (Database -> SQL Editor -> New query -> paste -> Run).
--
-- Design notes:
--  * Scoring rule: a pick's fantasy points combine hole-by-hole bonuses
--    (pars/birdies/eagles/bogeys/etc., each worth a commissioner-set number
--    of points), a bogey-free-round bonus, a share of the golfer's tournament
--    winnings ($) at tournaments.winnings_scoring_pct%, and a missed-cut
--    penalty — see `public.scoring_settings` for the editable point values
--    and on/off toggles, and the `tournament_result_points` view below for
--    the single source-of-truth calculation used by every screen.
--  * Results (including hole tallies) are entered by a commissioner/admin.
--    The hole tallies are usually auto-filled from live scoring data (see
--    lib/live-scores.ts) but the commissioner can always correct them —
--    tournament_results is the row a commissioner fills in/reviews per
--    golfer per tournament after the event wraps.
--  * tournament_results is keyed by tournament_id (which itself carries a
--    `course` column), so course-level historical analytics per golfer are
--    possible later without a schema change.

-- ---------------------------------------------------------------------------
-- Reset (safe to re-run): drop everything this script creates first, so
-- running this file always starts from a clean slate no matter what
-- partial/failed state is currently in the database.
-- ---------------------------------------------------------------------------
drop view if exists public.major_lineup_points cascade;
drop view if exists public.one_and_done_standings cascade;
drop view if exists public.one_and_done_pick_points cascade;
drop view if exists public.major_lineup_totals cascade;
drop view if exists public.tournament_result_points cascade;

drop table if exists public.major_lineup_golfers cascade;
drop table if exists public.major_lineups cascade;
drop table if exists public.one_and_done_picks cascade;
drop table if exists public.tournament_results cascade;
drop table if exists public.scoring_settings cascade;
drop table if exists public.tournament_field cascade;
drop table if exists public.golfer_salaries cascade;
drop table if exists public.tournaments cascade;
drop table if exists public.golfers cascade;
drop table if exists public.profiles cascade;

drop function if exists public.check_golfer_not_reused() cascade;
drop function if exists public.prevent_self_admin_escalation() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.fantasy_points(numeric, boolean, numeric) cascade;
drop function if exists public.handle_new_user() cascade;

drop trigger if exists on_auth_user_created on auth.users;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per league member, keyed to auth.users.';

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- golfers
-- ---------------------------------------------------------------------------
create table if not exists public.golfers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  world_rank integer,
  active boolean not null default true,
  headshot_url text,
  created_at timestamptz not null default now()
);

create unique index if not exists golfers_name_key on public.golfers (name);

-- ---------------------------------------------------------------------------
-- tournaments
-- ---------------------------------------------------------------------------
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course text,
  location text,
  start_date date not null,
  end_date date not null,
  is_major boolean not null default false,
  field_size integer,
  purse numeric(12, 2),
  -- Percentage of a golfer's tournament winnings that convert to fantasy
  -- points for a pick, e.g. 1.00 = 1%. Set higher for majors.
  winnings_scoring_pct numeric(6, 3) not null default 1.000,
  pick_lock_at timestamptz,
  -- Free-text season segment this tournament counts toward for segment
  -- standings (e.g. "Segment 1"). Null = not part of any segment.
  segment text,
  -- The commissioner can pin exactly one tournament as "current" on the
  -- dashboard/leaderboard, overriding the automatic nearest-by-date pick.
  -- The partial unique index below enforces "at most one" at the DB level.
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tournaments_start_date_idx on public.tournaments (start_date);
create unique index if not exists tournaments_one_featured_idx on public.tournaments (is_featured) where is_featured;

-- ---------------------------------------------------------------------------
-- tournament_field: which golfers are actually playing a given tournament.
-- A commissioner sets this from Commissioner Tools once the field is known
-- for the week. The One & Done picker only shows golfers listed here; if a
-- tournament has no field rows yet (not set up), the app falls back to
-- showing every active golfer, so nothing breaks for older tournaments.
-- ---------------------------------------------------------------------------
create table if not exists public.tournament_field (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  golfer_id uuid not null references public.golfers (id) on delete cascade,
  primary key (tournament_id, golfer_id)
);

create index if not exists tournament_field_tournament_idx on public.tournament_field (tournament_id);

-- ---------------------------------------------------------------------------
-- golfer_salaries (Major Challenge salaries, can vary per tournament)
-- ---------------------------------------------------------------------------
create table if not exists public.golfer_salaries (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  golfer_id uuid not null references public.golfers (id) on delete cascade,
  salary numeric(10, 2) not null,
  primary key (tournament_id, golfer_id)
);

-- ---------------------------------------------------------------------------
-- scoring_settings — a single editable row of point values + on/off toggles
-- for the hole-by-hole scoring rules. Commissioner-editable in Commissioner
-- Tools; every rule can be turned off without deleting its point value, so
-- flipping it back on later restores the number that was there before.
-- ---------------------------------------------------------------------------
create table if not exists public.scoring_settings (
  id integer primary key default 1,
  par_enabled boolean not null default true,
  par_pts numeric not null default 1,
  birdie_enabled boolean not null default true,
  birdie_pts numeric not null default 2,
  eagle_enabled boolean not null default true,
  eagle_pts numeric not null default 3,
  better_eagle_enabled boolean not null default true,
  better_eagle_pts numeric not null default 5,
  bogey_enabled boolean not null default true,
  bogey_pts numeric not null default -2,
  double_bogey_enabled boolean not null default true,
  double_bogey_pts numeric not null default -3,
  worse_double_enabled boolean not null default true,
  worse_double_pts numeric not null default -5,
  bogey_free_enabled boolean not null default true,
  bogey_free_pts numeric not null default 1000,
  winnings_pct_enabled boolean not null default true,
  missed_cut_enabled boolean not null default true,
  missed_cut_pts numeric not null default -5000,
  updated_at timestamptz not null default now(),
  constraint scoring_settings_singleton check (id = 1)
);

insert into public.scoring_settings (id) values (1)
  on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- tournament_results (entered manually by the commissioner — pars/birdies/
-- etc. are auto-filled from live hole-by-hole data when available, but the
-- commissioner can always correct any number before saving)
-- ---------------------------------------------------------------------------
create table if not exists public.tournament_results (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  golfer_id uuid not null references public.golfers (id) on delete cascade,
  winnings numeric(12, 2) not null default 0,
  made_cut boolean not null default true,
  finish_position text, -- text to allow "T4", "CUT", "WD" etc.
  pars integer not null default 0,
  birdies integer not null default 0,
  eagles integer not null default 0,
  better_than_eagle integer not null default 0,
  bogeys integer not null default 0,
  double_bogeys integer not null default 0,
  worse_than_double integer not null default 0,
  bogey_free_rounds integer not null default 0,
  entered_by uuid references public.profiles (id),
  entered_at timestamptz not null default now(),
  primary key (tournament_id, golfer_id)
);

-- ---------------------------------------------------------------------------
-- Fantasy points calculation — single source of truth
--
--   points = (pars × par pts) + (birdies × birdie pts) + (eagles × eagle
--   pts) + (better-than-eagle × their pts) + (bogeys × bogey pts) +
--   (double bogeys × double bogey pts) + (worse-than-double × their pts) +
--   (bogey-free rounds × bogey-free bonus) + (winnings × tournament's
--   winnings %) + (missed-cut penalty, if they missed the cut) — every term
--   is zeroed out if that rule is toggled off in scoring_settings.
-- ---------------------------------------------------------------------------
create or replace function public.fantasy_points(p_winnings numeric, p_made_cut boolean, p_pct numeric)
returns numeric
language sql
immutable
as $$
  -- Kept for backward compatibility (winnings-% only preview); the real
  -- scoring below (tournament_result_points) is the source of truth.
  select case
    when p_made_cut is false then 0
    else round(greatest(p_winnings, 0) * (p_pct / 100.0), 2)
  end;
$$;

-- Convenience view: every entered result, with the points it's worth.
create or replace view public.tournament_result_points as
select
  tr.tournament_id,
  tr.golfer_id,
  tr.winnings,
  tr.made_cut,
  tr.finish_position,
  tr.pars,
  tr.birdies,
  tr.eagles,
  tr.better_than_eagle,
  tr.bogeys,
  tr.double_bogeys,
  tr.worse_than_double,
  tr.bogey_free_rounds,
  t.winnings_scoring_pct,
  (
    coalesce(tr.pars, 0) * (case when coalesce(s.par_enabled, true) then coalesce(s.par_pts, 1) else 0 end)
    + coalesce(tr.birdies, 0) * (case when coalesce(s.birdie_enabled, true) then coalesce(s.birdie_pts, 2) else 0 end)
    + coalesce(tr.eagles, 0) * (case when coalesce(s.eagle_enabled, true) then coalesce(s.eagle_pts, 3) else 0 end)
    + coalesce(tr.better_than_eagle, 0) * (case when coalesce(s.better_eagle_enabled, true) then coalesce(s.better_eagle_pts, 5) else 0 end)
    + coalesce(tr.bogeys, 0) * (case when coalesce(s.bogey_enabled, true) then coalesce(s.bogey_pts, -2) else 0 end)
    + coalesce(tr.double_bogeys, 0) * (case when coalesce(s.double_bogey_enabled, true) then coalesce(s.double_bogey_pts, -3) else 0 end)
    + coalesce(tr.worse_than_double, 0) * (case when coalesce(s.worse_double_enabled, true) then coalesce(s.worse_double_pts, -5) else 0 end)
    + coalesce(tr.bogey_free_rounds, 0) * (case when coalesce(s.bogey_free_enabled, true) then coalesce(s.bogey_free_pts, 1000) else 0 end)
    + (case when coalesce(s.winnings_pct_enabled, true) then round(greatest(tr.winnings, 0) * (t.winnings_scoring_pct / 100.0), 2) else 0 end)
    + (case when tr.made_cut is false and coalesce(s.missed_cut_enabled, true) then coalesce(s.missed_cut_pts, -5000) else 0 end)
  ) as points
from public.tournament_results tr
join public.tournaments t on t.id = tr.tournament_id
left join public.scoring_settings s on s.id = 1;

-- ---------------------------------------------------------------------------
-- one_and_done_picks
-- ---------------------------------------------------------------------------
create table if not exists public.one_and_done_picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  golfer_id uuid not null references public.golfers (id) on delete cascade,
  picked_at timestamptz not null default now(),
  unique (user_id, tournament_id)
);

create index if not exists odp_user_idx on public.one_and_done_picks (user_id);

-- Enforce "can't reuse a golfer" at the database level: a user may not have
-- two picks (across different tournaments) with the same golfer_id.
create or replace function public.check_golfer_not_reused()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.one_and_done_picks
    where user_id = new.user_id
      and golfer_id = new.golfer_id
      and tournament_id <> new.tournament_id
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'You have already used this golfer this season.';
  end if;
  return new;
end;
$$;

drop trigger if exists odp_no_reuse on public.one_and_done_picks;
create trigger odp_no_reuse
  before insert or update on public.one_and_done_picks
  for each row execute procedure public.check_golfer_not_reused();

-- ---------------------------------------------------------------------------
-- major_lineups / major_lineup_golfers
-- ---------------------------------------------------------------------------
create table if not exists public.major_lineups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  unique (user_id, tournament_id)
);

create table if not exists public.major_lineup_golfers (
  lineup_id uuid not null references public.major_lineups (id) on delete cascade,
  golfer_id uuid not null references public.golfers (id) on delete cascade,
  salary_at_pick numeric(10, 2) not null,
  primary key (lineup_id, golfer_id)
);

-- Enforce the 5-golfer / $50,000 cap at the database level via a check on
-- insert count + a view; simplest reliable enforcement lives in the app
-- layer (see lib/scoring.ts / the major-challenge page), backed by this
-- helper view a commissioner can audit against.
create or replace view public.major_lineup_totals as
select
  ml.id as lineup_id,
  ml.user_id,
  ml.tournament_id,
  count(mlg.golfer_id) as golfer_count,
  coalesce(sum(mlg.salary_at_pick), 0) as total_salary
from public.major_lineups ml
left join public.major_lineup_golfers mlg on mlg.lineup_id = ml.id
group by ml.id, ml.user_id, ml.tournament_id;

-- ---------------------------------------------------------------------------
-- Standings views
-- ---------------------------------------------------------------------------

-- One & Done: points per user per tournament (0 if no result entered yet).
create or replace view public.one_and_done_pick_points as
select
  p.id as pick_id,
  p.user_id,
  p.tournament_id,
  p.golfer_id,
  p.picked_at,
  coalesce(trp.points, 0) as points,
  trp.made_cut,
  trp.winnings
from public.one_and_done_picks p
left join public.tournament_result_points trp
  on trp.tournament_id = p.tournament_id and trp.golfer_id = p.golfer_id;

-- Season standings: total One & Done points per user, across all weeks.
create or replace view public.one_and_done_standings as
select
  pr.id as user_id,
  pr.display_name,
  coalesce(sum(pp.points), 0) as total_points,
  count(pp.pick_id) as weeks_picked
from public.profiles pr
left join public.one_and_done_pick_points pp on pp.user_id = pr.id
group by pr.id, pr.display_name
order by total_points desc;

-- Segment standings: same as above, but scoped to one season segment at a
-- time. Every profile appears in every segment that has at least one
-- tournament assigned to it, even with 0 points, same left-join pattern as
-- the overall standings view.
create or replace view public.one_and_done_standings_by_segment as
select
  seg.segment,
  pr.id as user_id,
  pr.display_name,
  coalesce(sum(pp.points), 0) as total_points,
  count(pp.pick_id) as weeks_picked
from (select distinct segment from public.tournaments where segment is not null) seg
cross join public.profiles pr
left join public.one_and_done_pick_points pp
  on pp.user_id = pr.id
  and pp.tournament_id in (select id from public.tournaments t2 where t2.segment = seg.segment)
group by seg.segment, pr.id, pr.display_name
order by seg.segment, total_points desc;

-- Major Challenge standings: total lineup points per user per tournament.
create or replace view public.major_lineup_points as
select
  ml.id as lineup_id,
  ml.user_id,
  ml.tournament_id,
  coalesce(sum(coalesce(trp.points, 0)), 0) as total_points
from public.major_lineups ml
join public.major_lineup_golfers mlg on mlg.lineup_id = ml.id
left join public.tournament_result_points trp
  on trp.tournament_id = ml.tournament_id and trp.golfer_id = mlg.golfer_id
group by ml.id, ml.user_id, ml.tournament_id;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.golfers enable row level security;
alter table public.tournaments enable row level security;
alter table public.golfer_salaries enable row level security;
alter table public.tournament_field enable row level security;
alter table public.tournament_results enable row level security;
alter table public.scoring_settings enable row level security;
alter table public.one_and_done_picks enable row level security;
alter table public.major_lineups enable row level security;
alter table public.major_lineup_golfers enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- profiles: readable by everyone, including logged-out visitors (the public
-- homepage shows the season leaderboard by display name); a user can update
-- only their own row (display_name); admin flag can only be changed by an
-- existing admin.
drop policy if exists "profiles are readable by authenticated users" on public.profiles;
drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "profiles are readable by everyone"
  on public.profiles for select
  to public
  using (true);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Prevent a non-admin from granting themselves admin via that same update
-- (kept as a trigger rather than a self-referential RLS check, which would
-- risk recursive policy evaluation on this table).
create or replace function public.prevent_self_admin_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_no_self_escalation on public.profiles;
create trigger profiles_no_self_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_self_admin_escalation();

-- golfers: readable by everyone, including logged-out visitors; writable
-- only by admins.
drop policy if exists "golfers are readable by authenticated users" on public.golfers;
drop policy if exists "golfers are readable by everyone" on public.golfers;
create policy "golfers are readable by everyone"
  on public.golfers for select
  to public
  using (true);

drop policy if exists "admins manage golfers" on public.golfers;
create policy "admins manage golfers"
  on public.golfers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- tournaments: readable by everyone, including logged-out visitors (the
-- public homepage shows the next/latest tournament); writable only by admins.
drop policy if exists "tournaments are readable by authenticated users" on public.tournaments;
drop policy if exists "tournaments are readable by everyone" on public.tournaments;
create policy "tournaments are readable by everyone"
  on public.tournaments for select
  to public
  using (true);

drop policy if exists "admins manage tournaments" on public.tournaments;
create policy "admins manage tournaments"
  on public.tournaments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- golfer_salaries: readable by everyone signed in; writable only by admins.
drop policy if exists "salaries are readable by authenticated users" on public.golfer_salaries;
create policy "salaries are readable by authenticated users"
  on public.golfer_salaries for select
  to authenticated
  using (true);

drop policy if exists "admins manage salaries" on public.golfer_salaries;
create policy "admins manage salaries"
  on public.golfer_salaries for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- tournament_field: readable by everyone signed in; writable only by admins.
drop policy if exists "field is readable by authenticated users" on public.tournament_field;
create policy "field is readable by authenticated users"
  on public.tournament_field for select
  to authenticated
  using (true);

drop policy if exists "admins manage field" on public.tournament_field;
create policy "admins manage field"
  on public.tournament_field for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- tournament_results: readable by everyone, including logged-out visitors
-- (needed to compute points shown on the public leaderboard); writable only
-- by admins.
drop policy if exists "results are readable by authenticated users" on public.tournament_results;
drop policy if exists "results are readable by everyone" on public.tournament_results;
create policy "results are readable by everyone"
  on public.tournament_results for select
  to public
  using (true);

drop policy if exists "admins manage results" on public.tournament_results;
create policy "admins manage results"
  on public.tournament_results for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- scoring_settings: readable by everyone (points shown on the public
-- leaderboard depend on it); editable only by admins.
drop policy if exists "scoring settings are readable by everyone" on public.scoring_settings;
create policy "scoring settings are readable by everyone"
  on public.scoring_settings for select
  to public
  using (true);

drop policy if exists "admins manage scoring settings" on public.scoring_settings;
create policy "admins manage scoring settings"
  on public.scoring_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- one_and_done_picks: readable by everyone, including logged-out visitors
-- (the public leaderboard shows who picked whom); a user may only
-- insert/update/delete their OWN picks.
drop policy if exists "picks are readable by authenticated users" on public.one_and_done_picks;
drop policy if exists "picks are readable by everyone" on public.one_and_done_picks;
create policy "picks are readable by everyone"
  on public.one_and_done_picks for select
  to public
  using (true);

drop policy if exists "users manage their own picks" on public.one_and_done_picks;
create policy "users manage their own picks"
  on public.one_and_done_picks for all
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- major_lineups / major_lineup_golfers: same pattern.
drop policy if exists "lineups are readable by authenticated users" on public.major_lineups;
create policy "lineups are readable by authenticated users"
  on public.major_lineups for select
  to authenticated
  using (true);

drop policy if exists "users manage their own lineups" on public.major_lineups;
create policy "users manage their own lineups"
  on public.major_lineups for all
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "lineup golfers are readable by authenticated users" on public.major_lineup_golfers;
create policy "lineup golfers are readable by authenticated users"
  on public.major_lineup_golfers for select
  to authenticated
  using (true);

drop policy if exists "users manage their own lineup golfers" on public.major_lineup_golfers;
create policy "users manage their own lineup golfers"
  on public.major_lineup_golfers for all
  to authenticated
  using (
    exists (
      select 1 from public.major_lineups ml
      where ml.id = lineup_id and (ml.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.major_lineups ml
      where ml.id = lineup_id and (ml.user_id = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Grants (Supabase projects grant these by default via ALTER DEFAULT
-- PRIVILEGES for new tables/views created by the postgres role, but they're
-- spelled out explicitly here for safety — RLS above still governs row
-- access; these just allow the roles to query the objects at all).
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- Read access: granted broadly to both anon (logged-out visitors) and
-- authenticated users. The RLS policies above still govern which of these
-- are actually public (tournaments, golfers, profiles, tournament_results,
-- one_and_done_picks) versus authenticated-only in practice (golfer_salaries,
-- major_lineups, major_lineup_golfers currently have no "to public" policy).
grant select on
  public.profiles,
  public.golfers,
  public.tournaments,
  public.golfer_salaries,
  public.tournament_field,
  public.tournament_results,
  public.scoring_settings,
  public.one_and_done_picks,
  public.major_lineups,
  public.major_lineup_golfers
to anon, authenticated;

grant select on
  public.tournament_result_points,
  public.one_and_done_pick_points,
  public.one_and_done_standings,
  public.one_and_done_standings_by_segment,
  public.major_lineup_points,
  public.major_lineup_totals
to anon, authenticated;

-- Write access: authenticated users only (RLS above further restricts to
-- "own row" or admin-only as appropriate).
grant insert, update, delete on
  public.profiles,
  public.golfers,
  public.tournaments,
  public.golfer_salaries,
  public.tournament_field,
  public.tournament_results,
  public.scoring_settings,
  public.one_and_done_picks,
  public.major_lineups,
  public.major_lineup_golfers
to authenticated;

grant execute on function public.fantasy_points(numeric, boolean, numeric) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed data: 2026 PGA Tour schedule (from the prototype's TEST_2026_TOURNAMENTS)
-- ---------------------------------------------------------------------------
insert into public.tournaments (name, course, location, start_date, end_date, is_major, winnings_scoring_pct, purse)
values
  ('Sony Open in Hawaii', 'Waialae Country Club', 'Honolulu, HI', '2026-01-15', '2026-01-18', false, 1.0, 8300000),
  ('Farmers Insurance Open', 'Torrey Pines (South)', 'San Diego, CA', '2026-01-29', '2026-02-01', false, 1.0, 9200000),
  ('AT&T Pebble Beach Pro-Am', 'Pebble Beach Golf Links', 'Pebble Beach, CA', '2026-02-12', '2026-02-15', false, 1.0, 9200000),
  ('The Genesis Invitational', 'Riviera Country Club', 'Pacific Palisades, CA', '2026-02-19', '2026-02-22', false, 1.5, 20000000),
  ('Arnold Palmer Invitational', 'Bay Hill Club & Lodge', 'Orlando, FL', '2026-03-05', '2026-03-08', false, 1.5, 20000000),
  ('THE PLAYERS Championship', 'TPC Sawgrass (Stadium)', 'Ponte Vedra Beach, FL', '2026-03-12', '2026-03-15', false, 1.5, 25000000),
  ('Masters Tournament', 'Augusta National Golf Club', 'Augusta, GA', '2026-04-09', '2026-04-12', true, 3.0, 20000000),
  ('PGA Championship', 'Aronimink Golf Club', 'Newtown Square, PA', '2026-05-14', '2026-05-17', true, 3.0, 19000000),
  ('U.S. Open', 'Shinnecock Hills Golf Club', 'Southampton, NY', '2026-06-18', '2026-06-21', true, 3.0, 21500000),
  ('The Open Championship', 'Royal Birkdale Golf Club', 'Southport, England', '2026-07-16', '2026-07-19', true, 3.0, 17000000),
  ('TOUR Championship', 'East Lake Golf Club', 'Atlanta, GA', '2026-08-27', '2026-08-30', false, 2.0, 100000000)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Seed data: golfers (top current PGA Tour players, approximate world ranks)
-- ---------------------------------------------------------------------------
insert into public.golfers (name, world_rank, active) values
  ('Scottie Scheffler', 1, true),
  ('Rory McIlroy', 2, true),
  ('Xander Schauffele', 3, true),
  ('Collin Morikawa', 4, true),
  ('Ludvig Åberg', 5, true),
  ('Viktor Hovland', 6, true),
  ('Patrick Cantlay', 7, true),
  ('Wyndham Clark', 8, true),
  ('Tommy Fleetwood', 9, true),
  ('Hideki Matsuyama', 10, true),
  ('Justin Thomas', 11, true),
  ('Sahith Theegala', 12, true),
  ('Sungjae Im', 13, true),
  ('Brian Harman', 14, true),
  ('Russell Henley', 15, true),
  ('Max Homa', 16, true),
  ('Tony Finau', 17, true),
  ('Akshay Bhatia', 18, true),
  ('Sepp Straka', 19, true),
  ('Keegan Bradley', 20, true),
  ('Jason Day', 21, true),
  ('Corey Conners', 22, true),
  ('Shane Lowry', 23, true),
  ('Cameron Young', 24, true),
  ('Denny McCarthy', 25, true),
  ('Byeong Hun An', 26, true),
  ('J.T. Poston', 27, true),
  ('Aaron Rai', 28, true),
  ('Billy Horschel', 29, true),
  ('Chris Kirk', 30, true)
on conflict (name) do nothing;
