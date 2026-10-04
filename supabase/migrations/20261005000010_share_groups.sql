-- Subjects that are the same course in different programs (e.g. Engineering Mathematics I in CSE and
-- Civil) share one `share_group`. Notes, PYQs and other non-syllabus resources uploaded to ANY
-- subject in the group are shown on all of them. Syllabus is never shared (each program has its
-- own syllabus PDF). NULL = no sharing.
alter table public.subjects add column if not exists share_group text;
create index if not exists subjects_share_group_idx on public.subjects (share_group) where share_group is not null;
