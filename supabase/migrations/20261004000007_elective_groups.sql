-- Semesters 7 and 8 have several elective groups (Elective I, II, III).
-- NULL for core subjects.
alter table public.subjects add column if not exists elective_group text;

create index if not exists subjects_elective_group_idx
  on public.subjects (semester_id, elective_group) where elective_group is not null;
