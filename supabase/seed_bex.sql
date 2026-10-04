-- Electronics and Telecommunication Engineering (BEX) curriculum, generated from the official BEX detailed syllabus index.
-- Idempotent and independent of the CSE seed. Requires migrations up to 20261005000008_subject_marks.sql.
-- Subject slugs are prefixed "ex-" because slugs are globally unique across programs.
-- The BEX syllabus covers Year I to Year IV Part I (Semesters I-VII); Semester VIII is added when its syllabus exists.

INSERT INTO programs (slug, name, short_name, is_active, sort_order)
VALUES ('bex', 'Electronics and Telecommunication Engineering (BEX)', 'BEX', true, 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO years (program_id, number)
SELECT p.id, y.n FROM programs p CROSS JOIN (VALUES (1), (2), (3), (4)) AS y(n)
WHERE p.slug = 'bex'
ON CONFLICT DO NOTHING;

-- Year N -> semesters 2N-1 and 2N, but only up to Semester VII (no Semester VIII syllabus yet)
INSERT INTO semesters (year_id, number)
SELECT y.id, s.semester_num
FROM years y
JOIN programs p ON p.id = y.program_id AND p.slug = 'bex'
CROSS JOIN LATERAL (VALUES (y.number * 2 - 1), (y.number * 2)) AS s(semester_num)
WHERE s.semester_num <= 7
ON CONFLICT DO NOTHING;

-- Semester 1 (Year 1)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bex') AND number = 1)
  AND number = 1
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ex-engineering-mathematics-i', 'Engineering Mathematics I', 'SH 401', false, NULL, 1, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'ex-computer-programming', 'Computer Programming', 'CT 401', false, NULL, 2, '3-1-3', 45, 150),
  ((SELECT id FROM sem), 'ex-engineering-drawing-i', 'Engineering Drawing I', 'ME 401', false, NULL, 3, '1-0-3', 15, 100),
  ((SELECT id FROM sem), 'ex-engineering-physics', 'Engineering Physics', 'SH 402', false, NULL, 4, '4-1-2', 60, 125),
  ((SELECT id FROM sem), 'ex-applied-mechanics', 'Applied Mechanics', 'CE 401', false, NULL, 5, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'ex-basic-electrical-engineering', 'Basic Electrical Engineering', 'EE 401', false, NULL, 6, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 2 (Year 1)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bex') AND number = 1)
  AND number = 2
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ex-engineering-mathematics-ii', 'Engineering Mathematics II', 'SH 451', false, NULL, 1, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'ex-engineering-drawing-ii', 'Engineering Drawing II', 'ME 451', false, NULL, 2, '1-0-3', 15, 100),
  ((SELECT id FROM sem), 'ex-basic-electronics-engineering', 'Basic Electronics Engineering', 'EX 451', false, NULL, 3, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-engineering-chemistry', 'Engineering Chemistry', 'SH 453', false, NULL, 4, '3-1-3', 45, 125),
  ((SELECT id FROM sem), 'ex-fundamentals-of-thermodynamics-and-heat-transfer', 'Fundamentals of Thermodynamics & Heat Transfer', 'ME 452', false, NULL, 5, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 3 (Year 2)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bex') AND number = 2)
  AND number = 3
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ex-engineering-mathematics-iii', 'Engineering Mathematics III', 'SH 501', false, NULL, 1, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'ex-object-oriented-programming', 'Object Oriented Programming', 'CT 501', false, NULL, 2, '3-0-3', 45, 150),
  ((SELECT id FROM sem), 'ex-electric-circuit-theory', 'Electric Circuit Theory', 'EE 501', false, NULL, 3, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-electrical-engineering-material', 'Electrical Engineering Material', 'EE 502', false, NULL, 4, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'ex-electronic-devices-and-circuits', 'Electronic Devices and Circuits', 'EX 501', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-digital-logic', 'Digital Logic', 'EX 502', false, NULL, 6, '3-1-3', 45, 150),
  ((SELECT id FROM sem), 'ex-electromagnetism', 'Electromagnetism', 'EX 503', false, NULL, 7, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 4 (Year 2)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bex') AND number = 2)
  AND number = 4
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ex-electrical-machine', 'Electrical Machine', 'EE 554', false, NULL, 1, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-numerical-method', 'Numerical Method', 'SH 553', false, NULL, 2, '3-1-3', 45, 150),
  ((SELECT id FROM sem), 'ex-applied-mathematics', 'Applied Mathematics', 'SH 551', false, NULL, 3, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'ex-instrumentation-i', 'Instrumentation I', 'EE 552', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-power-system', 'Power System', 'EE 553', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-microprocessor', 'Microprocessor', 'EX 551', false, NULL, 6, '3-1-3', 45, 150),
  ((SELECT id FROM sem), 'ex-discrete-structure', 'Discrete Structure', 'CT 551', false, NULL, 7, '3-0-0', 45, 100)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 5 (Year 3)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bex') AND number = 3)
  AND number = 5
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ex-communication-english', 'Communication English', 'SH 601', false, NULL, 1, '3-1-2', 45, 125),
  ((SELECT id FROM sem), 'ex-probability-and-statistics', 'Probability and Statistics', 'SH 602', false, NULL, 2, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'ex-computer-organization-and-architecture', 'Computer Organization and Architecture', 'CT 603', false, NULL, 3, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-control-system', 'Control System', 'EE 602', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-advanced-electronics', 'Advanced Electronics', 'EX 601', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-instrumentation-ii', 'Instrumentation II', 'EX 602', false, NULL, 6, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-computer-graphics', 'Computer Graphics', 'EX 603', false, NULL, 7, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 6 (Year 3)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bex') AND number = 3)
  AND number = 6
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ex-engineering-economics', 'Engineering Economics', 'CE 655', false, NULL, 1, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'ex-signal-analysis', 'Signal Analysis', 'EX 651', false, NULL, 2, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-communication-system-i', 'Communication System I', 'EX 652', false, NULL, 3, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-antenna-and-propagation', 'Antenna and Propagation', 'EX 653', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-embedded-system', 'Embedded System', 'CT 655', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-computer-networks', 'Computer Networks', 'CT 658', false, NULL, 6, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-minor-project', 'Minor Project', 'EX 654', false, NULL, 7, '0-0-4', 60, 50)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 7 (Year 4)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bex') AND number = 4)
  AND number = 7
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'ex-project-management', 'Project Management', 'CT 701', false, NULL, 1, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'ex-organization-and-management', 'Organization and Management', 'ME 708', false, NULL, 2, '2-1-0', 30, 100),
  ((SELECT id FROM sem), 'ex-energy-environment-and-society', 'Energy, Environment and Society', 'EX 701', false, NULL, 3, '2-0-0', 30, 50),
  ((SELECT id FROM sem), 'ex-filter-design', 'Filter Design', 'EX 704', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'ex-communication-system-ii', 'Communication System II', 'EX 702', false, NULL, 5, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;
