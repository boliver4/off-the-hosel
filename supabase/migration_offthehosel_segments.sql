-- Assigns each of the 29 "Off The Hosel" tournaments to a Q1-Q4 segment,
-- matching the house-league format (four segments, top 3 paid in each,
-- top 7-10 paid overall). Splash never publishes the exact segment date
-- cutoffs on the public contest page — those go out in a separate
-- spreadsheet each year — so this is a reasonable chronological split into
-- four groups of ~7 tournaments each. Re-run safely any time; only updates
-- rows whose name matches (ILIKE), so it's a no-op for anything not yet in
-- your tournaments table, and re-assigning is a plain overwrite.
--
-- If your commissioner spreadsheet has different cutoffs once it arrives,
-- just fix individual tournaments in Commissioner Tools -> Tournament
-- Settings instead of re-running this.

-- Segment Q1
update public.tournaments set segment = 'Q1' where name ilike '%waste management%' or name ilike '%phoenix open%';
update public.tournaments set segment = 'Q1' where name ilike '%pebble beach%';
update public.tournaments set segment = 'Q1' where name ilike '%genesis invitational%';
update public.tournaments set segment = 'Q1' where name ilike '%cognizant%';
update public.tournaments set segment = 'Q1' where name ilike '%arnold palmer%';
update public.tournaments set segment = 'Q1' where name ilike '%players championship%';
update public.tournaments set segment = 'Q1' where name ilike '%valspar%';
update public.tournaments set segment = 'Q1' where name ilike '%houston open%';

-- Segment Q2
update public.tournaments set segment = 'Q2' where name ilike '%valero%';
update public.tournaments set segment = 'Q2' where name ilike '%masters%' and name not ilike '%3m%';
update public.tournaments set segment = 'Q2' where name ilike '%rbc heritage%';
update public.tournaments set segment = 'Q2' where name ilike '%miami championship%';
update public.tournaments set segment = 'Q2' where name ilike '%truist%';
update public.tournaments set segment = 'Q2' where name ilike '%pga championship%';
update public.tournaments set segment = 'Q2' where name ilike '%byron nelson%' or name ilike '%cj cup%byron%';

-- Segment Q3
update public.tournaments set segment = 'Q3' where name ilike '%charles schwab%';
update public.tournaments set segment = 'Q3' where name ilike '%memorial tournament%';
update public.tournaments set segment = 'Q3' where name ilike '%rbc canadian%';
update public.tournaments set segment = 'Q3' where name ilike '%u.s. open%' or name ilike '%us open%';
update public.tournaments set segment = 'Q3' where name ilike '%travelers%';
update public.tournaments set segment = 'Q3' where name ilike '%john deere%';
update public.tournaments set segment = 'Q3' where name ilike '%scottish open%';

-- Segment Q4
update public.tournaments set segment = 'Q4' where name ilike '%open championship%' or (name ilike '%british open%');
update public.tournaments set segment = 'Q4' where name ilike '%3m open%';
update public.tournaments set segment = 'Q4' where name ilike '%rocket mortgage%';
update public.tournaments set segment = 'Q4' where name ilike '%wyndham%';
update public.tournaments set segment = 'Q4' where name ilike '%st. jude%' or name ilike '%st jude%';
update public.tournaments set segment = 'Q4' where name ilike '%bmw championship%';
update public.tournaments set segment = 'Q4' where name ilike '%tour championship%' and name not ilike '%pga tour championship%';

-- Sanity check: run this after, and fix anything left blank by hand in
-- Commissioner Tools -> Tournament Settings (a name that didn't match
-- exactly above, e.g. a slightly different sponsor name this year).
-- select name, segment from public.tournaments where segment is null order by start_date;
