-- Civil Engineering (BCE) curriculum, generated from the official BCE detailed syllabus index.
-- Idempotent and independent of the CSE seed. Requires migrations up to 20261005000008_subject_marks.sql.
-- Subject slugs are prefixed "ce-" because slugs are globally unique and Civil's Year I subjects have
-- different codes/syllabi than CSE's (e.g. Engineering Chemistry SH 403 vs SH 453).

INSERT INTO programs (slug, name, short_name, is_active, sort_order)
VALUES ('civil', 'Civil Engineering (BCE)', 'BCE', true, 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO years (program_id, number)
SELECT p.id, y.n FROM programs p CROSS JOIN (VALUES (1), (2), (3), (4)) AS y(n)
WHERE p.slug = 'civil'
ON CONFLICT DO NOTHING;

-- Each year has exactly two semesters (year N -> semesters 2N-1 and 2N)
INSERT INTO semesters (year_id, number)
SELECT y.id, s.semester_num
FROM years y
JOIN programs p ON p.id = y.program_id AND p.slug = 'civil'
CROSS JOIN LATERAL (VALUES (y.number * 2 - 1), (y.number * 2)) AS s(semester_num)
ON CONFLICT DO NOTHING;

-- Semester 1 (Year 1)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'civil') AND number = 1)
  AND number = 1
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ce-engineering-chemistry', 'Engineering Chemistry', 'SH 403', false, NULL, 1, '3-1-3', 45, 125),
  ((SELECT id FROM sem), 'ce-fundamentals-of-thermodynamics-and-heat-transfer', 'Fundamentals of Thermodynamics & Heat Transfer', 'ME 402', false, NULL, 2, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ce-engineering-mathematics-i', 'Engineering Mathematics I', 'SH 401', false, NULL, 3, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'ce-engineering-drawing-i', 'Engineering Drawing I', 'ME 401', false, NULL, 4, '1-0-3', 15, 100),
  ((SELECT id FROM sem), 'ce-computer-programming-c', 'Computer Programming (C)', 'CT 401', false, NULL, 5, '3-1-3', 45, 150)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 2 (Year 1)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'civil') AND number = 1)
  AND number = 2
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ce-engineering-physics', 'Engineering Physics', 'SH 452', false, NULL, 1, '4-1-2', 60, 125),
  ((SELECT id FROM sem), 'ce-engineering-drawing-ii', 'Engineering Drawing II', 'ME 451', false, NULL, 2, '1-0-3', 15, 100),
  ((SELECT id FROM sem), 'ce-basic-electrical-engineering', 'Basic Electrical Engineering', 'EE 451', false, NULL, 3, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ce-basic-electronics-engineering', 'Basic Electronics Engineering', 'EX 451', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ce-engineering-mathematics-ii', 'Engineering Mathematics II', 'SH 451', false, NULL, 5, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'ce-applied-mechanics-statics', 'Applied Mechanics (Statics)', 'CE 451', false, NULL, 6, '3-2-0', 45, 100)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 3 (Year 2)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'civil') AND number = 2)
  AND number = 3
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ce-civil-engineering-materials', 'Civil Engineering Materials', 'CE 506', false, NULL, 1, '3-1-2', 45, 125),
  ((SELECT id FROM sem), 'ce-engineering-mathematics-iii', 'Engineering Mathematics III', 'SH 501', false, NULL, 2, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'ce-applied-mechanics-dynamics', 'Applied Mechanics (Dynamics)', 'CE 501', false, NULL, 3, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'ce-engineering-geology-i', 'Engineering Geology I', 'CE 505', false, NULL, 4, '3-1-2', 45, 125),
  ((SELECT id FROM sem), 'ce-strength-of-materials', 'Strength of Materials', 'CE 502', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ce-surveying-i', 'Surveying I', 'CE 504', false, NULL, 6, '3-1-3', 45, 150),
  ((SELECT id FROM sem), 'ce-fluid-mechanics', 'Fluid Mechanics', 'CE 503', false, NULL, 7, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 4 (Year 2)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'civil') AND number = 2)
  AND number = 4
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ce-hydraulics', 'Hydraulics', 'CE 551', false, NULL, 1, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ce-surveying-ii', 'Surveying II', 'CE 552', false, NULL, 2, '3-1-3', 45, 150),
  ((SELECT id FROM sem), 'ce-theory-of-structure-i', 'Theory of Structure I', 'CE 553', false, NULL, 3, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'ce-probability-and-statistics', 'Probability and Statistics', 'SH 552', false, NULL, 4, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'ce-engineering-geology-ii', 'Engineering Geology II', 'CE 554', false, NULL, 5, '3-1-2', 45, 125),
  ((SELECT id FROM sem), 'ce-building-drawing', 'Building Drawing', 'CE 555', false, NULL, 6, '1-0-3', 15, 100),
  ((SELECT id FROM sem), 'ce-soil-mechanics', 'Soil Mechanics', 'CE 556', false, NULL, 7, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 5 (Year 3)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'civil') AND number = 3)
  AND number = 5
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ce-theory-of-structure-ii', 'Theory of Structure II', 'CE 601', false, NULL, 1, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'ce-water-supply-engineering', 'Water Supply Engineering', 'CE 602', false, NULL, 2, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ce-engineering-hydrology', 'Engineering Hydrology', 'CE 603', false, NULL, 3, '3-1-1', 45, 125),
  ((SELECT id FROM sem), 'ce-concrete-technology-and-masonry-structure', 'Concrete Technology and Masonry Structure', 'CE 604', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ce-numerical-methods', 'Numerical Methods', 'SH 603', false, NULL, 5, '3-1-3', 45, 150),
  ((SELECT id FROM sem), 'ce-foundation-engineering', 'Foundation Engineering', 'CE 605', false, NULL, 6, '3-1-1', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 6 (Year 3)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'civil') AND number = 3)
  AND number = 6
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ce-design-of-steel-and-timber-structure', 'Design of Steel and Timber Structure', 'CE 651', false, NULL, 1, '3-1-1', 45, 125),
  ((SELECT id FROM sem), 'ce-communication-english', 'Communication English', 'SH 651', false, NULL, 2, '3-1-2', 45, 125),
  ((SELECT id FROM sem), 'ce-engineering-economics', 'Engineering Economics', 'CE 655', false, NULL, 3, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'ce-building-technology', 'Building Technology', 'CE 652', false, NULL, 4, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'ce-sanitary-engineering', 'Sanitary Engineering', 'CE 653', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ce-transportation-engineering', 'Transportation Engineering', 'CE 654', false, NULL, 6, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ce-irrigation-and-drainage', 'Irrigation and Drainage', 'CE 656', false, NULL, 7, '3-1-1', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 7 (Year 4)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'civil') AND number = 4)
  AND number = 7
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ce-estimating-and-costing', 'Estimating and Costing', 'CE 702', false, NULL, 1, '3-1-1', 45, 125),
  ((SELECT id FROM sem), 'ce-design-of-rcc-structure', 'Design of RCC Structure', 'CE 701', false, NULL, 2, '3-1-1', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 8 (Year 4)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'civil') AND number = 4)
  AND number = 8
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ce-technology-environment-and-society', 'Technology, Environment and Society', 'CE 755', false, NULL, 1, '2-0-0', 30, 50),
  ((SELECT id FROM sem), 'ce-construction-management', 'Construction Management', 'CE 751', false, NULL, 2, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'ce-engineering-professional-practice', 'Engineering Professional Practice', 'CE 752', false, NULL, 3, '2-1-0', 30, 50),
  ((SELECT id FROM sem), 'ce-computational-techniques-in-civil-engineering', 'Computational Techniques in Civil Engineering', 'CE 753', false, NULL, 4, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;
