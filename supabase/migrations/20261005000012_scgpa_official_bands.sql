-- =============================================================================
-- IOE Connect :: 0012 official SCGPA grading scale (2080/81)
-- Replaces the placeholder bands with the official scale supplied by the site owner:
--   80+ A 4.0 | 75-79 A- 3.7 | 70-74 B+ 3.3 | 65-69 B 3.0 | 60-64 B- 2.7
--   55-59 C+ 2.3 | 50-54 C 2.0 | 40-49 D 1.0 | below 40 F 0
-- Overwrites site_settings.scgpa.grades and the scgpa_grades mirror. Idempotent.
-- (The 20% internal rule and the 40%-per-component pass rule live in application code.)
-- =============================================================================

delete from public.scgpa_grades;

insert into public.scgpa_grades (grade, points, sort_order, min_percent) values
  ('A', 4.0, 1, 80), ('A-', 3.7, 2, 75), ('B+', 3.3, 3, 70), ('B', 3.0, 4, 65), ('B-', 2.7, 5, 60),
  ('C+', 2.3, 6, 55), ('C', 2.0, 7, 50), ('D', 1.0, 8, 40), ('F', 0, 9, 0);

insert into public.site_settings (key, value, is_public)
values ('scgpa', jsonb_build_object('scale', 4.0, 'decimals', 2, 'min_pass_points', 1.0, 'grades', '[]'::jsonb), true)
on conflict (key) do nothing;

update public.site_settings
   set value = jsonb_set(
         value,
         '{grades}',
         jsonb_build_array(
           jsonb_build_object('grade', 'A',  'points', 4.0, 'min_percent', 80),
           jsonb_build_object('grade', 'A-', 'points', 3.7, 'min_percent', 75),
           jsonb_build_object('grade', 'B+', 'points', 3.3, 'min_percent', 70),
           jsonb_build_object('grade', 'B',  'points', 3.0, 'min_percent', 65),
           jsonb_build_object('grade', 'B-', 'points', 2.7, 'min_percent', 60),
           jsonb_build_object('grade', 'C+', 'points', 2.3, 'min_percent', 55),
           jsonb_build_object('grade', 'C',  'points', 2.0, 'min_percent', 50),
           jsonb_build_object('grade', 'D',  'points', 1.0, 'min_percent', 40),
           jsonb_build_object('grade', 'F',  'points', 0,   'min_percent', 0)
         ),
         true)
 where key = 'scgpa';
