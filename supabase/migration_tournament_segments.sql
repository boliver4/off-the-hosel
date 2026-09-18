-- Adds season "segments" (e.g. "Segment 1", "Segment 2"...) that a
-- tournament can belong to, for segment-scoped standings, plus a way to
-- manually pin one tournament as the "current" one shown on the
-- dashboard/leaderboard. Safe to run on the live database — purely
-- additive, nothing existing is touched.
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run.

alter table public.tournaments add column if not exists segment text;
alter table public.tournaments add column if not exists is_featured boolean not null default false;

-- Enforces "at most one featured tournament" at the database level.
create unique index if not exists tournaments_one_featured_idx on public.tournaments (is_featured) where is_featured;

-- Segment standings: same shape as one_and_done_standings, scoped to one
-- segment at a time. Every league member appears in every segment that has
-- at least one tournament assigned to it, even with 0 points.
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

grant select on public.one_and_done_standings_by_segment to anon, authenticated;
