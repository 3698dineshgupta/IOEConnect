-- =============================================================================
-- IOE Connect :: 0009 SCGPA percentage bands
-- Adds min_percent (lowest % that earns the grade) to every SCGPA grade row, in
-- site_settings.scgpa (source of truth) and the scgpa_grades mirror table.
--
-- The values below are UNVERIFIED DEFAULTS, not confirmed against the official
-- TU/IOE grading rules. Admins should confirm them in /admin/settings → SCGPA.
--
-- Idempotent: only rows that have no min_percent yet are filled; admin-entered
-- values are never overwritten. Grades not in the default list are left as-is
-- (the app then ignores them until the admin sets a minimum %).
-- =============================================================================

-- Mirror table column
alter table public.scgpa_grades
  add column if not exists min_percent numeric(5,2)
  check (min_percent is null or min_percent between 0 and 100);

-- Default band per grade
with defaults(grade, min_percent) as (
  values ('A+', 90), ('A', 80), ('B+', 70), ('B', 60), ('C+', 50), ('C', 45), ('D', 40), ('F', 0)
)
update public.scgpa_grades g
   set min_percent = d.min_percent
  from defaults d
 where g.grade = d.grade
   and g.min_percent is null;

-- site_settings.scgpa.grades[*].min_percent
with defaults(grade, min_percent) as (
  values ('A+', 90), ('A', 80), ('B+', 70), ('B', 60), ('C+', 50), ('C', 45), ('D', 40), ('F', 0)
)
update public.site_settings s
   set value = jsonb_set(
         s.value,
         '{grades}',
         (
           select coalesce(jsonb_agg(
                    case
                      when elem ? 'min_percent' then elem
                      when d.min_percent is not null then elem || jsonb_build_object('min_percent', d.min_percent)
                      else elem
                    end
                    order by ord), '[]'::jsonb)
             from jsonb_array_elements(s.value -> 'grades') with ordinality as t(elem, ord)
             left join defaults d on d.grade = upper(trim(elem ->> 'grade'))
         )
       )
 where s.key = 'scgpa'
   and jsonb_typeof(s.value -> 'grades') = 'array'
   and exists (
     select 1 from jsonb_array_elements(s.value -> 'grades') e where not (e ? 'min_percent')
   );
