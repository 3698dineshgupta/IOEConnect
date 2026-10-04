-- Idempotent seed for the IOE CSE (BCT) curriculum.
-- Safe to re-run: programs/years/semesters use ON CONFLICT DO NOTHING;
-- subjects are upserted by slug so names, codes and ordering stay current.
-- Requires migration 20261004000007_elective_groups.sql (subjects.elective_group).

-- Program
INSERT INTO programs (slug, name, is_active)
VALUES ('cse', 'Computer Engineering (CSE)', true)
ON CONFLICT (slug) DO NOTHING;

-- Years 1-4
INSERT INTO years (program_id, number)
SELECT p.id, y.n
FROM programs p
CROSS JOIN (VALUES (1), (2), (3), (4)) AS y(n)
WHERE p.slug = 'cse'
ON CONFLICT DO NOTHING;

-- Semesters: each year has exactly two (year N -> semesters 2N-1 and 2N)
-- Year 1: 1,2 | Year 2: 3,4 | Year 3: 5,6 | Year 4: 7,8
INSERT INTO semesters (year_id, number)
SELECT y.id, s.semester_num
FROM years y
JOIN programs p ON p.id = y.program_id AND p.slug = 'cse'
CROSS JOIN LATERAL (VALUES (y.number * 2 - 1), (y.number * 2)) AS s(semester_num)
ON CONFLICT DO NOTHING;

-- Clean up semesters from an earlier version of this seed that put all 8
-- semesters under every year. Only removes empty ones (no subjects attached).
DELETE FROM semesters s
USING years y, programs p
WHERE s.year_id = y.id
  AND y.program_id = p.id
  AND p.slug = 'cse'
  AND s.number NOT IN (y.number * 2 - 1, y.number * 2)
  AND NOT EXISTS (SELECT 1 FROM subjects sub WHERE sub.semester_id = s.id);

-- ---------------------------------------------------------------------------
-- Subjects. Columns: semester, slug, name, code, is_elective, elective_group, sort_order
-- ---------------------------------------------------------------------------

-- Semester 1 (Year 1)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'cse') AND number = 1)
  AND number = 1
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order)
VALUES
  ((SELECT id FROM sem), 'applied-mechanics', 'Applied Mechanics', 'CE 401', false, NULL, 1),
  ((SELECT id FROM sem), 'basic-electrical-engineering', 'Basic Electrical Engineering', 'EE 401', false, NULL, 2),
  ((SELECT id FROM sem), 'engineering-physics', 'Engineering Physics', 'SH 402', false, NULL, 3),
  ((SELECT id FROM sem), 'engineering-drawing-i', 'Engineering Drawing I', 'ME 401', false, NULL, 4),
  ((SELECT id FROM sem), 'engineering-mathematics-i', 'Engineering Mathematics I', 'SH 401', false, NULL, 5),
  ((SELECT id FROM sem), 'c-programming', 'Computer Programming', 'CT 401', false, NULL, 6)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code,
  is_elective = EXCLUDED.is_elective, elective_group = EXCLUDED.elective_group, sort_order = EXCLUDED.sort_order;

-- Semester 2 (Year 1)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'cse') AND number = 1)
  AND number = 2
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order)
VALUES
  ((SELECT id FROM sem), 'engineering-mathematics-ii', 'Engineering Mathematics II', 'SH 451', false, NULL, 1),
  ((SELECT id FROM sem), 'engineering-drawing-ii', 'Engineering Drawing II', 'ME 451', false, NULL, 2),
  ((SELECT id FROM sem), 'basic-electronics', 'Basic Electronics Engineering', 'EX 451', false, NULL, 3),
  ((SELECT id FROM sem), 'engineering-chemistry', 'Engineering Chemistry', 'SH 453', false, NULL, 4),
  ((SELECT id FROM sem), 'thermodynamics', 'Fundamental of Thermodynamics & Heat Transfer', 'ME 452', false, NULL, 5),
  ((SELECT id FROM sem), 'workshop-technology', 'Workshop Technology', 'ME 453', false, NULL, 6)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code,
  is_elective = EXCLUDED.is_elective, elective_group = EXCLUDED.elective_group, sort_order = EXCLUDED.sort_order;

-- Semester 3 (Year 2)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'cse') AND number = 2)
  AND number = 3
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order)
VALUES
  ((SELECT id FROM sem), 'engineering-mathematics-iii', 'Engineering Mathematics III', 'SH 501', false, NULL, 1),
  ((SELECT id FROM sem), 'object-oriented-programming', 'Object Oriented Programming', 'CT 501', false, NULL, 2),
  ((SELECT id FROM sem), 'electrical-circuit-theory', 'Electric Circuit Theory', 'EE 501', false, NULL, 3),
  ((SELECT id FROM sem), 'theory-of-computation', 'Theory of Computation', 'CT 502', false, NULL, 4),
  ((SELECT id FROM sem), 'electronics-devices-and-circuit', 'Electronics Devices and Circuit', 'EX 501', false, NULL, 5),
  ((SELECT id FROM sem), 'digital-logics', 'Digital Logic', 'EX 502', false, NULL, 6),
  ((SELECT id FROM sem), 'electromagnetism', 'Electromagnetics', 'EX 503', false, NULL, 7)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code,
  is_elective = EXCLUDED.is_elective, elective_group = EXCLUDED.elective_group, sort_order = EXCLUDED.sort_order;

-- Semester 4 (Year 2)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'cse') AND number = 2)
  AND number = 4
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order)
VALUES
  ((SELECT id FROM sem), 'numerical-method', 'Numerical Method', 'SH 553', false, NULL, 1),
  ((SELECT id FROM sem), 'applied-mathematics', 'Applied Mathematics', 'SH 551', false, NULL, 2),
  ((SELECT id FROM sem), 'instrumentation-i', 'Instrumentation I', 'EE 552', false, NULL, 3),
  ((SELECT id FROM sem), 'data-structure-and-algorithm', 'Data Structure and Algorithm', 'CT 552', false, NULL, 4),
  ((SELECT id FROM sem), 'microprocessor', 'Microprocessor', 'EX 551', false, NULL, 5),
  ((SELECT id FROM sem), 'discrete-structure', 'Discrete Structure', 'CT 551', false, NULL, 6),
  ((SELECT id FROM sem), 'electrical-machine-i', 'Electrical Machine', 'EE 554', false, NULL, 7)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code,
  is_elective = EXCLUDED.is_elective, elective_group = EXCLUDED.elective_group, sort_order = EXCLUDED.sort_order;

-- Semester 5 (Year 3)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'cse') AND number = 3)
  AND number = 5
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order)
VALUES
  ((SELECT id FROM sem), 'communication-english', 'Communication English', 'SH 601', false, NULL, 1),
  ((SELECT id FROM sem), 'probability-and-statistics', 'Probability and Statistics', 'SH 602', false, NULL, 2),
  ((SELECT id FROM sem), 'computer-organization-and-architecture', 'Computer Organization and Architecture', 'CT 603', false, NULL, 3),
  ((SELECT id FROM sem), 'software-engineering', 'Software Engineering', 'CT 601', false, NULL, 4),
  ((SELECT id FROM sem), 'computer-graphics', 'Computer Graphics', 'EX 603', false, NULL, 5),
  ((SELECT id FROM sem), 'instrumentation-ii', 'Instrumentation II', 'EX 602', false, NULL, 6),
  ((SELECT id FROM sem), 'data-communication', 'Data Communication', 'CT 602', false, NULL, 7)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code,
  is_elective = EXCLUDED.is_elective, elective_group = EXCLUDED.elective_group, sort_order = EXCLUDED.sort_order;

-- Semester 6 (Year 3)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'cse') AND number = 3)
  AND number = 6
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order)
VALUES
  ((SELECT id FROM sem), 'engineering-economics', 'Engineering Economics', 'CE 655', false, NULL, 1),
  ((SELECT id FROM sem), 'object-oriented-analysis', 'Object Oriented Analysis and Design', 'CT 651', false, NULL, 2),
  ((SELECT id FROM sem), 'artificial-intelligence', 'Artificial Intelligence', 'CT 653', false, NULL, 3),
  ((SELECT id FROM sem), 'operating-system', 'Operating System', 'CT 656', false, NULL, 4),
  ((SELECT id FROM sem), 'embedded-system', 'Embedded System', 'CT 655', false, NULL, 5),
  ((SELECT id FROM sem), 'database-management-system', 'Database Management System', 'CT 652', false, NULL, 6),
  ((SELECT id FROM sem), 'minor-project', 'Minor Project', 'CT 654', false, NULL, 7)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code,
  is_elective = EXCLUDED.is_elective, elective_group = EXCLUDED.elective_group, sort_order = EXCLUDED.sort_order;

-- Semester 7 (Year 4)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'cse') AND number = 4)
  AND number = 7
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order)
VALUES
  ((SELECT id FROM sem), 'ict-project-management', 'ICT Project Management', 'CT 701', false, NULL, 1),
  ((SELECT id FROM sem), 'organization-and-management', 'Organization and Management', 'ME 708', false, NULL, 2),
  ((SELECT id FROM sem), 'energy-environment-and-society', 'Energy Environment and Society', 'EX 701', false, NULL, 3),
  ((SELECT id FROM sem), 'distributed-system', 'Distributed System', 'CT 703', false, NULL, 4),
  ((SELECT id FROM sem), 'computer-network-and-security', 'Computer Networks and Security', 'CT 702', false, NULL, 5),
  ((SELECT id FROM sem), 'digital-signal-and-analysis-processing', 'Digital Signal Analysis and Processing', 'CT 704', false, NULL, 6),
  ((SELECT id FROM sem), 'project-part-a', 'Project (Part A)', 'CT 707', false, NULL, 7),
  -- Elective I (choose one)
  ((SELECT id FROM sem), 'advanced-java', 'Advanced Java', 'CT 725 01', true, 'Elective I', 8),
  ((SELECT id FROM sem), 'aeronautical-telecom', 'Aeronautical Telecom', 'EX 725 04', true, 'Elective I', 9),
  ((SELECT id FROM sem), 'biomedical-instrumentation', 'Biomedical Instrumentation', NULL, true, 'Elective I', 10),
  ((SELECT id FROM sem), 'data-mining', 'Data Mining', NULL, true, 'Elective I', 11),
  ((SELECT id FROM sem), 'embedded-system-elective', 'Embedded System', NULL, true, 'Elective I', 12),
  ((SELECT id FROM sem), 'image-processing', 'Image Processing', 'CT 725 04', true, 'Elective I', 13),
  ((SELECT id FROM sem), 'microwave-engineering', 'Microwave Engineering', 'EX 725 05', true, 'Elective I', 14),
  ((SELECT id FROM sem), 'operating-system-elective', 'Operating System', NULL, true, 'Elective I', 15),
  ((SELECT id FROM sem), 'radar-technology', 'Radar Technology', NULL, true, 'Elective I', 16),
  ((SELECT id FROM sem), 'satellite-communication', 'Satellite Communication', NULL, true, 'Elective I', 17),
  ((SELECT id FROM sem), 'web-technology', 'Web Technology', 'CT 725 05', true, 'Elective I', 18)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code,
  is_elective = EXCLUDED.is_elective, elective_group = EXCLUDED.elective_group, sort_order = EXCLUDED.sort_order;

-- Semester 8 (Year 4)
WITH sem AS (
  SELECT id FROM semesters
  WHERE year_id = (SELECT id FROM years WHERE program_id = (SELECT id FROM programs WHERE slug = 'cse') AND number = 4)
  AND number = 8
)
INSERT INTO subjects (semester_id, slug, name, code, is_elective, elective_group, sort_order)
VALUES
  ((SELECT id FROM sem), 'engineering-professional-practice', 'Engineering Professional Practice', 'CE 752', false, NULL, 1),
  ((SELECT id FROM sem), 'information-system', 'Information Systems', 'CT 751', false, NULL, 2),
  ((SELECT id FROM sem), 'internet-and-intranet', 'Internet and Intranet', 'CT 754', false, NULL, 3),
  ((SELECT id FROM sem), 'project-part-b', 'Project (Part B)', 'CT 755', false, NULL, 4),
  ((SELECT id FROM sem), 'simulation-and-modeling', 'Simulation and Modelling', 'CT 753', false, NULL, 5),
  -- Elective II (choose one)
  ((SELECT id FROM sem), 'advanced-computer-architecture', 'Advanced Computer Architecture', 'CT 765 04', true, 'Elective II', 6),
  ((SELECT id FROM sem), 'agile-software-development', 'Agile Software Development', 'CT 765 02', true, 'Elective II', 7),
  ((SELECT id FROM sem), 'big-data-technologies', 'Big Data Technologies', 'CT 765 07', true, 'Elective II', 8),
  ((SELECT id FROM sem), 'broadcast-engineering', 'Broadcast Engineering', 'EX 765 03', true, 'Elective II', 9),
  ((SELECT id FROM sem), 'database-management-systems-elective', 'Database Management Systems', 'EX 765 06', true, 'Elective II', 10),
  ((SELECT id FROM sem), 'networking-with-ipv6', 'Networking with IPv6', 'CT 765 03', true, 'Elective II', 11),
  ((SELECT id FROM sem), 'optical-fiber-communication-system', 'Optical Fiber Communication System', 'EX 765 01', true, 'Elective II', 12),
  ((SELECT id FROM sem), 'wireless-communications', 'Wireless Communications', 'EX 765 04', true, 'Elective II', 13),
  -- Elective III (choose one)
  ((SELECT id FROM sem), 'artificial-intelligence-elective', 'Artificial Intelligence', 'CT 785 06', true, 'Elective III', 14),
  ((SELECT id FROM sem), 'enterprise-application-design-and-development', 'Enterprise Application Design and Development', 'CT 785 04', true, 'Elective III', 15),
  ((SELECT id FROM sem), 'geographical-information-system', 'Geographical Information System', 'CT 785 07', true, 'Elective III', 16),
  ((SELECT id FROM sem), 'multimedia-system', 'Multimedia System', 'CT 785 03', true, 'Elective III', 17),
  ((SELECT id FROM sem), 'power-electronics', 'Power Electronics', 'EE 785 07', true, 'Elective III', 18),
  ((SELECT id FROM sem), 'remote-sensing', 'Remote Sensing', 'CT 785 01', true, 'Elective III', 19),
  ((SELECT id FROM sem), 'speech-processing', 'Speech Processing', 'CT 785 08', true, 'Elective III', 20),
  ((SELECT id FROM sem), 'telecommunication', 'Telecommunication', 'EX 785 03', true, 'Elective III', 21),
  ((SELECT id FROM sem), 'xml-foundations-techniques-and-applications', 'XML: Foundations, Techniques and Applications', 'CT 785 05', true, 'Elective III', 22)
ON CONFLICT (slug) DO UPDATE SET
  semester_id = EXCLUDED.semester_id, name = EXCLUDED.name, code = EXCLUDED.code,
  is_elective = EXCLUDED.is_elective, elective_group = EXCLUDED.elective_group, sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- Marks / hours per subject (requires migration 20261005000008_subject_marks.sql)
-- ---------------------------------------------------------------------------
-- Real figures from the official BCT detailed syllabus index (L-T-P per week, lecture hours, total marks).
-- credits stay NULL: the syllabus does not list credit hours. Re-runnable.
UPDATE subjects AS s SET ltp = v.ltp, lecture_hours = v.hours, full_marks = v.marks
FROM (VALUES
  ('engineering-mathematics-i', '3-2-0', 45, 100),
  ('c-programming', '3-1-3', 45, 150),
  ('engineering-drawing-i', '1-0-3', 15, 100),
  ('engineering-physics', '4-1-2', 60, 125),
  ('applied-mechanics', '3-2-0', 45, 100),
  ('basic-electrical-engineering', '3-1-1.5', 45, 125),
  ('engineering-mathematics-ii', '3-2-0', 45, 100),
  ('engineering-drawing-ii', '1-0-3', 15, 100),
  ('basic-electronics', '3-1-1.5', 45, 125),
  ('engineering-chemistry', '3-1-3', 45, 125),
  ('thermodynamics', '3-1-1.5', 45, 125),
  ('workshop-technology', '1-0-3', 15, 100),
  ('engineering-mathematics-iii', '3-2-0', 45, 100),
  ('object-oriented-programming', '3-0-3', 45, 150),
  ('electrical-circuit-theory', '3-1-1.5', 45, 125),
  ('theory-of-computation', '3-1-0', 45, 100),
  ('electronics-devices-and-circuit', '3-1-1.5', 45, 125),
  ('digital-logics', '3-1-3', 45, 150),
  ('electromagnetism', '3-1-1.5', 45, 125),
  ('electrical-machine-i', '3-1-1.5', 45, 125),
  ('numerical-method', '3-1-3', 45, 150),
  ('applied-mathematics', '3-1-0', 45, 100),
  ('instrumentation-i', '3-1-1.5', 45, 125),
  ('data-structure-and-algorithm', '3-0-3', 45, 150),
  ('microprocessor', '3-1-3', 45, 150),
  ('discrete-structure', '3-0-0', 45, 100),
  ('communication-english', '3-1-2', 45, 125),
  ('probability-and-statistics', '3-1-0', 45, 100),
  ('computer-organization-and-architecture', '3-1-1.5', 45, 125),
  ('software-engineering', '3-1-1', 45, 125),
  ('computer-graphics', '3-1-1.5', 45, 125),
  ('instrumentation-ii', '3-1-1.5', 45, 125),
  ('data-communication', '3-1-1.5', 45, 125),
  ('engineering-economics', '3-1-0', 45, 100),
  ('object-oriented-analysis', '3-1-1.5', 45, 125),
  ('artificial-intelligence', '3-1-1.5', 45, 125),
  ('operating-system', '3-1-1.5', 45, 125),
  ('embedded-system', '3-1-1.5', 45, 125),
  ('database-management-system', '3-1-1.5', 45, 125),
  ('ict-project-management', '3-1-0', 45, 100),
  ('organization-and-management', '2-1-0', 30, 100),
  ('energy-environment-and-society', '2-0-0', 30, 50),
  ('distributed-system', '3-1-1.5', 45, 125),
  ('computer-network-and-security', '3-1-1.5', 45, 125),
  ('digital-signal-and-analysis-processing', '3-1-1.5', 45, 125),
  ('engineering-professional-practice', '2-1-0', 30, 50),
  ('information-system', '3-1-1.5', 45, 125),
  ('internet-and-intranet', '3-1-3', 45, 150),
  ('simulation-and-modeling', '3-1-1.5', 45, 125),
  ('data-mining', '3-1-1.5', 45, 125),
  ('web-technology', '3-1-1.5', 45, 125),
  ('advanced-java', '3-1-1.5', 45, 125),
  ('image-processing', '3-1-1.5', 45, 125),
  ('radar-technology', '3-1-1.5', 45, 125),
  ('biomedical-instrumentation', '3-1-1.5', 45, 125),
  ('agile-software-development', '3-1-1.5', 45, 125),
  ('networking-with-ipv6', '3-1-1.5', 45, 125),
  ('advanced-computer-architecture', '3-1-1.5', 45, 125),
  ('big-data-technologies', '3-1-1.5', 45, 125),
  ('optical-fiber-communication-system', '3-1-1.5', 45, 125),
  ('broadcast-engineering', '3-1-1.5', 45, 125),
  ('wireless-communications', '3-1-1.5', 45, 125),
  ('database-management-systems-elective', '3-1-1.5', 45, 125),
  ('multimedia-system', '3-1-1.5', 45, 125),
  ('enterprise-application-design-and-development', '3-1-1.5', 45, 125),
  ('geographical-information-system', '3-1-1.5', 45, 125),
  ('power-electronics', '3-1-1.5', 45, 125),
  ('remote-sensing', '3-1-1.5', 45, 125),
  ('xml-foundations-techniques-and-applications', '3-1-1.5', 45, 125),
  ('artificial-intelligence-elective', '3-1-1.5', 45, 125),
  ('speech-processing', '3-1-1.5', 45, 125),
  ('telecommunication', '3-1-1.5', 45, 125)
) AS v(slug, ltp, hours, marks)
WHERE s.slug = v.slug;
