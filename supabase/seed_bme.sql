-- Mechanical Engineering (BME) curriculum, generated from the official BME detailed syllabus index.
-- Idempotent and independent of the other seeds. Requires migrations up to 20261005000008_subject_marks.sql.
-- Subject slugs are prefixed "me-" because slugs are globally unique across programs.
-- Covers Semesters I-VIII (44 subjects).

INSERT INTO programs (slug, name, short_name, is_active, sort_order)
VALUES ('bme', 'Mechanical Engineering (BME)', 'BME', true, 5)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO years (program_id, number)
SELECT p.id, y.n FROM programs p CROSS JOIN (VALUES (1), (2), (3), (4)) AS y(n)
WHERE p.slug = 'bme'
ON CONFLICT DO NOTHING;

INSERT INTO semesters (year_id, number)
SELECT y.id, s.semester_num
FROM years y
JOIN programs p ON p.id = y.program_id AND p.slug = 'bme'
CROSS JOIN LATERAL (VALUES (y.number * 2 - 1), (y.number * 2)) AS s(semester_num)
WHERE s.semester_num <= 8
ON CONFLICT DO NOTHING;

-- Semester 1 (Year 1)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bme') AND number = 1)
  AND number = 1
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'me-engineering-mathematics-i', 'Engineering Mathematics I', 'SH 401', false, NULL, 1, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'me-computer-programming', 'Computer Programming', 'CT 401', false, NULL, 2, '3-1-3', 45, 150),
  ((SELECT id FROM sem), 'me-engineering-drawing-i', 'Engineering Drawing I', 'ME 401', false, NULL, 3, '1-0-3', 15, 100),
  ((SELECT id FROM sem), 'me-engineering-chemistry', 'Engineering Chemistry', 'SH 403', false, NULL, 4, '3-1-3', 45, 125),
  ((SELECT id FROM sem), 'me-fundamentals-of-thermodynamics-and-heat-transfer', 'Fundamentals of Thermodynamics & Heat Transfer', 'ME 402', false, NULL, 5, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 2 (Year 1)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bme') AND number = 1)
  AND number = 2
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'me-engineering-mathematics-ii', 'Engineering Mathematics II', 'SH 451', false, NULL, 1, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'me-engineering-drawing-ii', 'Engineering Drawing II', 'ME 451', false, NULL, 2, '1-0-3', 15, 100),
  ((SELECT id FROM sem), 'me-basic-electronics-engineering', 'Basic Electronics Engineering', 'EX 451', false, NULL, 3, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-engineering-physics', 'Engineering Physics', 'SH 452', false, NULL, 4, '4-1-2', 60, 125),
  ((SELECT id FROM sem), 'me-applied-mechanics-statics', 'Applied Mechanics (Statics)', 'CE 451', false, NULL, 5, '3-2-0', 45, 100)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 3 (Year 2)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bme') AND number = 2)
  AND number = 3
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'me-engineering-mathematics-iii', 'Engineering Mathematics III', 'SH 501', false, NULL, 1, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'me-material-science', 'Material Science', 'ME 501', false, NULL, 2, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-engineering-mechanics-dynamics', 'Engineering Mechanics (Dynamics)', 'ME 502', false, NULL, 3, '3-2-0', 45, 100),
  ((SELECT id FROM sem), 'me-metrology', 'Metrology', 'ME 503', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-applied-thermodynamics', 'Applied Thermodynamics', 'ME 504', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-electromagnetism', 'Electromagnetism', 'EX 503', false, NULL, 6, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 4 (Year 2)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bme') AND number = 2)
  AND number = 4
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'me-probability-and-statistics', 'Probability and Statistics', 'SH 552', false, NULL, 1, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'me-electrical-machine', 'Electrical Machine', 'EE 554', false, NULL, 2, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-manufacturing-and-production-process', 'Manufacturing and Production Process', 'ME 551', false, NULL, 3, '3-1-3', 45, 150),
  ((SELECT id FROM sem), 'me-strength-of-materials', 'Strength of Materials', 'ME 552', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-instrumentation-and-measurements', 'Instrumentation and Measurements', 'ME 553', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-fluid-mechanics', 'Fluid Mechanics', 'ME 554', false, NULL, 6, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 5 (Year 3)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bme') AND number = 3)
  AND number = 5
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'me-numerical-methods', 'Numerical Methods', 'SH 603', false, NULL, 1, '3-1-3', 45, 150),
  ((SELECT id FROM sem), 'me-control-system', 'Control System', 'EE 602', false, NULL, 2, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-organization-and-management', 'Organization and Management', 'ME 604', false, NULL, 3, '2-1-0', 30, 100),
  ((SELECT id FROM sem), 'me-mechanics-of-solids', 'Mechanics of Solids', 'ME 601', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-heat-transfer', 'Heat Transfer', 'ME 602', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-fluid-machines', 'Fluid Machines', 'ME 603', false, NULL, 6, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 6 (Year 3)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bme') AND number = 3)
  AND number = 6
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'me-communication-english', 'Communication English', 'SH 651', false, NULL, 1, '3-1-2', 45, 125),
  ((SELECT id FROM sem), 'me-machine-design-i', 'Machine Design I', 'ME 651', false, NULL, 2, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-industrial-engineering-and-management', 'Industrial Engineering and Management', 'ME 652', false, NULL, 3, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'me-theory-of-mechanism-and-machine-i', 'Theory of Mechanism and Machine I', 'ME 653', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-internal-combustion-engines', 'Internal Combustion Engines', 'ME 654', false, NULL, 5, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-energy-resources', 'Energy Resources', 'ME 655', false, NULL, 6, '3-1-1.5', 45, 125)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 7 (Year 4)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bme') AND number = 4)
  AND number = 7
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'me-machine-design-ii', 'Machine Design II', 'ME 701', false, NULL, 1, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-theory-of-mechanism-and-machine-ii', 'Theory of Mechanism and Machine II', 'ME 702', false, NULL, 2, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-engineering-economics', 'Engineering Economics', 'CE 705', false, NULL, 3, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'me-turbo-machines', 'Turbo Machines', 'ME 703', false, NULL, 4, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-environment-and-pollution-control', 'Environment and Pollution Control', 'ME 704', false, NULL, 5, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'me-industrial-attachment', 'Industrial Attachment', 'ME 705', false, NULL, 6, '0-0-8', 120, 100)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;

-- Semester 8 (Year 4)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'bme') AND number = 4)
  AND number = 8
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order, ltp, lecture_hours, full_marks)
VALUES
  ((SELECT id FROM sem), 'me-project-engineering', 'Project Engineering', 'ME 751', false, NULL, 1, '3-1-0', 45, 100),
  ((SELECT id FROM sem), 'me-finite-element-method', 'Finite Element Method', 'ME 752', false, NULL, 2, '3-1-1.5', 45, 125),
  ((SELECT id FROM sem), 'me-engineering-professional-practice', 'Engineering Professional Practice', 'CE 752', false, NULL, 3, '2-1-0', 30, 50),
  ((SELECT id FROM sem), 'me-project-i-and-ii', 'Project I and II', 'ME 755', false, NULL, 4, '0-0-6', 90, 100)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code, sort_order = EXCLUDED.sort_order,
  ltp = EXCLUDED.ltp, lecture_hours = EXCLUDED.lecture_hours, full_marks = EXCLUDED.full_marks;
