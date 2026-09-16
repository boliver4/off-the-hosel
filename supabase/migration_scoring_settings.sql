-- Off The Hosel — add editable hole-by-hole scoring
--
-- Run this in Supabase (Database -> SQL Editor -> New query -> paste -> Run).
--
-- IMPORTANT: unlike schema.sql, this script is SAFE to run against your
-- live database right now — it only adds new things (a new table, new
-- columns, an updated view) and never drops or clears your existing
-- golfers, tournaments, users, picks, or results. Nothing here deletes data.

-- ---------------------------------------------------------------------------
-- scoring_settings — a single editable row of point values + on/off toggles.
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
-- tournament_results — add the hole-tally columns (existing rows default to 0
-- for all of these, so nothing breaks for results already entered).
-- ---------------------------------------------------------------------------
alter table public.tournament_results add column if not exists pars integer not null default 0;
alter table public.tournament_results add column if not exists birdies integer not null default 0;
alter table public.tournament_results add column if not exists eagles integer not null default 0;
alter table public.tournament_results add column if not exists better_than_eagle integer not null default 0;
alter table public.tournament_results add column if not exists bogeys integer not null default 0;
alter table public.tournament_results add column if not exists double_bogeys integer not null default 0;
alter table public.tournament_results add column if not exists worse_than_double integer not null default 0;
alter table public.tournament_results add column if not exists bogey_free_rounds integer not null default 0;

-- ---------------------------------------------------------------------------
-- tournament_result_points — replace with the new formula.
-- ---------------------------------------------------------------------------
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
-- RLS + grants for the new table.
-- ---------------------------------------------------------------------------
alter table public.scoring_settings enable row level security;

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

grant select on public.scoring_settings to anon, authenticated;
grant insert, update, delete on public.scoring_settings to authenticated;
