-- The auto-seeded "General" trip was confusing for a first-time view of the
-- app ("someone new would just see General"). Drop it if it's still empty —
-- on a fresh install this fires right after 0001 seeds it, so new installs
-- never see it either; on an install where it already has expenses, leave
-- it alone rather than silently deleting real data.
delete from trips
where name = 'General'
  and not exists (select 1 from expenses where expenses.trip_id = trips.id);
