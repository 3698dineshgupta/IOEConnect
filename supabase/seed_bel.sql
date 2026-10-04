-- Electrical Engineering (BEL) curriculum, generated from the official BEL detailed syllabus index.
-- Idempotent and independent of the other seeds. Requires migrations up to 20261005000008_subject_marks.sql.
-- Subject slugs are prefixed "el-" because slugs are globally unique across programs.
-- Covers Semesters I-VII (43 subjects).

INSERT INTO programs (slug, name, short_name, is_active, sort_order)
VALUES ('bel', 'Electrical Engineering (BEL)', 'BEL', true, 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO years (program_id, number)
SELECT p.id, y.n FROM programs p CROSS JOIN (VALUES (1), (2), (3), (4)) AS y(n)
WHERE p.slug = 'bel'
ON CONFLICT DO NOTHING;

INSERT INTO semesters (year_id, number)
SELECT y.id, s.semester_num
FROM years y
JOIN programs p ON p.id = y.program_id AND p.slug = 'bel'
CROSS JOIN LATERAL (VALUES (y.number * 2 - 1), (y.number * 2)) AS s(semester_num)
WHERE s.semester_num <= 7
ON CONFLICT DO NOTHING;

-- Semester 1 (Year 1)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bel') AND number = 1)
  AND number = 1
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'el-applied-mechanics', 'Applied Mechanics', 'CE 401', false, NULL, 1, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'el-basic-electrical-engineering', 'Basic Electrical Engineering', 'EE 401', false, NULL, 2, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-engineering-drawing-i', 'Engineering Drawing I', 'ME 401', false, NULL, 3, '1-0-3', 15, 100),
  ((SELECT id FROM sem), 'el-engineering-physics', 'Engineering Physics', 'SH 402', false, NULL, 4, '4-1-2', 60, 125),
  ((SELECT id FROM sem), 'el-computer-programming-c', 'Computer Programming (C)', 'CT 401', false, NULL, 5, '3-1-3', 45, 150),
  ((SELECT id FROM sem), 'el-engineering-mathematics-i', 'Engineering Mathematics I', 'SH 401', false, NULL, 6, '3-2-0', 45, 100)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 2 (Year 1)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bel') AND number = 1)
  AND number = 2
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'el-fundamentals-of-thermodynamics-and-heat-transfer', 'Fundamentals of Thermodynamics & Heat Transfer', 'ME 452', false, NULL, 1, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-engineering-chemistry', 'Engineering Chemistry', 'SH 453', false, NULL, 2, '3-1-3', 45, 125),
  ((SELECT id FROM sem), 'el-engineering-mathematics-ii', 'Engineering Mathematics II', 'SH 451', false, NULL, 3, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'el-engineering-drawing-ii', 'Engineering Drawing II', 'ME 451', false, NULL, 4, '1-0-3', 15, 100),
  ((SELECT id FROM sem), 'el-basic-electronics-engineering', 'Basic Electronics Engineering', 'EX 451', false, NULL, 5, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 3 (Year 2)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bel') AND number = 2)
  AND number = 3
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'el-engineering-mathematics-iii', 'Engineering Mathematics III', 'SH 501', false, NULL, 1, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'el-object-oriented-programming', 'Object Oriented Programming', 'CT 501', false, NULL, 2, '3-0-3', 45, 150),
  ((SELECT id FROM sem), 'el-electric-circuit-theory', 'Electric Circuit Theory', 'EE 501', false, NULL, 3, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-electrical-engineering-material', 'Electrical Engineering Material', 'EE 502', false, NULL, 4, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'el-electronic-devices-and-circuits', 'Electronic Devices and Circuits', 'EX 501', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-digital-logic', 'Digital Logic', 'EX 502', false, NULL, 6, '3-1-3', 45, 150),
  ((SELECT id FROM sem), 'el-electromagnetism', 'Electromagnetism', 'EX 503', false, NULL, 7, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 4 (Year 2)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bel') AND number = 2)
  AND number = 4
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'el-electrical-machine-i', 'Electrical Machine I', 'EE 551', false, NULL, 1, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-numerical-method', 'Numerical Method', 'SH 553', false, NULL, 2, '3-1-3', 45, 150),
  ((SELECT id FROM sem), 'el-applied-mathematics', 'Applied Mathematics', 'SH 551', false, NULL, 3, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'el-instrumentation-i', 'Instrumentation I', 'EE 552', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-power-system-analysis-i', 'Power System Analysis I', 'EE 553', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-microprocessor', 'Microprocessor', 'EX 551', false, NULL, 6, '3-1-3', 45, 150)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 5 (Year 3)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bel') AND number = 3)
  AND number = 5
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'el-communication-english', 'Communication English', 'SH 601', false, NULL, 1, '3-1-2', 45, 125),
  ((SELECT id FROM sem), 'el-probability-and-statistics', 'Probability and Statistics', 'SH 602', false, NULL, 2, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'el-control-system', 'Control System', 'EE 604', false, NULL, 3, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-instrumentation-ii', 'Instrumentation II', 'EE 602', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-power-system-analysis-ii', 'Power System Analysis II', 'EE 603', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-electrical-machine-design', 'Electrical Machine Design', 'EE 605', false, NULL, 6, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-electrical-machine-ii', 'Electrical Machine II', 'EE 601', false, NULL, 7, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 6 (Year 3)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bel') AND number = 3)
  AND number = 6
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'el-engineering-economics', 'Engineering Economics', 'CE 655', false, NULL, 1, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'el-digital-control-system', 'Digital Control System', 'EE 651', false, NULL, 2, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-signal-analysis', 'Signal Analysis', 'EX 651', false, NULL, 3, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-switchgear-and-protection', 'Switchgear and Protection', 'EE 652', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-industrial-distribution-and-illumination', 'Industrial Distribution and Illumination', 'EE 653', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-hydro-power', 'Hydro Power', 'EE 654', false, NULL, 6, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 7 (Year 4)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bel') AND number = 4)
  AND number = 7
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'el-project-engineering', 'Project Engineering', 'CE 704', false, NULL, 1, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'el-organization-and-management', 'Organization and Management', 'ME 708', false, NULL, 2, '2-1-0', 30, 100),
  ((SELECT id FROM sem), 'el-technology-environment-and-society', 'Technology, Environment and Society', 'CE 703', false, NULL, 3, '2-0-0', 30, 50),
  ((SELECT id FROM sem), 'el-power-electronics', 'Power Electronics', 'EE 702', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-utilization-of-electrical-energy', 'Utilization of Electrical Energy', 'EE 703', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'el-power-plant-equipment', 'Power Plant Equipment', 'EE 704', false, NULL, 6, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;
