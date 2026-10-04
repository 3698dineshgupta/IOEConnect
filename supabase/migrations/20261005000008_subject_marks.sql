-- Marks/hours per subject, used by the SCGPA calculator and syllabus pages.
-- Values come from the official syllabus index (see seed.sql). NULL = unknown.
alter table public.subjects add column if not exists full_marks     int check (full_marks is null or full_marks between 1 and 1000);
alter table public.subjects add column if not exists ltp            text;  -- lecture-tutorial-practical hours per week, e.g. '3-1-1.5'
alter table public.subjects add column if not exists lecture_hours  int check (lecture_hours is null or lecture_hours >= 0);
