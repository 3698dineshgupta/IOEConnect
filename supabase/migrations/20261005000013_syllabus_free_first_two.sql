-- =============================================================================
-- IOE Connect :: 0013 syllabus access: first two subjects of each semester are free, the rest premium
--   * public.syllabus_access_for(subject_id): FREE when the subject is one of the first two in its
--     semester (order: sort_order, then name), otherwise PREMIUM. Applies to every program.
--   * BEFORE INSERT trigger: a newly uploaded SYLLABUS resource gets that access automatically
--     (bulk upload never sets access_type). Later edits by an admin are not overridden.
--   * One-off backfill of existing syllabus resources.
-- Premium is per program (see 0011): a locked syllabus opens for premium members of that program.
-- Re-run the UPDATE at the bottom after reordering a semester's subjects. Idempotent.
-- =============================================================================

create or replace function public.syllabus_access_for(p_subject_id uuid)
returns public.access_type
language sql
stable
set search_path = ''
as $$
  select case when coalesce(r.pos, 99) <= 2 then 'FREE'::public.access_type else 'PREMIUM'::public.access_type end
  from (
    select s.id,
           row_number() over (partition by s.semester_id order by s.sort_order, s.name) as pos
    from public.subjects s
    where s.semester_id = (select semester_id from public.subjects where id = p_subject_id)
  ) r
  where r.id = p_subject_id;
$$;

create or replace function public.resources_syllabus_access()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.resource_type = 'SYLLABUS' then
    new.access_type := coalesce(public.syllabus_access_for(new.subject_id), 'FREE'::public.access_type);
  end if;
  return new;
end;
$$;

drop trigger if exists resources_syllabus_access on public.resources;
create trigger resources_syllabus_access
  before insert on public.resources
  for each row execute function public.resources_syllabus_access();

-- Backfill every existing syllabus.
update public.resources r
   set access_type = public.syllabus_access_for(r.subject_id)
 where r.resource_type = 'SYLLABUS'
   and r.access_type is distinct from public.syllabus_access_for(r.subject_id);
