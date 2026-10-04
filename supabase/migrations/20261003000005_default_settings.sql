-- =============================================================================
-- IOE Connect :: 0005 default settings, SCGPA grade table, premium plans
-- All values are placeholders editable from /admin/settings. Idempotent:
-- existing rows are never overwritten.
-- =============================================================================

insert into public.site_settings (key, value, is_public) values
('site', jsonb_build_object(
  'name', 'IOE Connect',
  'tagline', 'Notes, past questions and resources for IOE students',
  'description', 'IOE Connect organises notes, past year questions, syllabus and reference material for Institute of Engineering students, semester by semester.',
  'contact_email', '',
  'social', jsonb_build_object('facebook', '', 'instagram', '', 'telegram', '', 'discord', '', 'youtube', ''),
  'announcement', jsonb_build_object('enabled', false, 'message', '', 'href', ''),
  'maintenance_mode', false,
  'allow_registrations', true
), true),

('premium', jsonb_build_object(
  'enabled', true,
  'currency', 'NPR',
  'free_preview_pages', 3,
  'benefits', jsonb_build_array(
    'Access to all premium notes and PYQs',
    'Year-wise past question filtering',
    'Early access to newly uploaded resources'
  )
), true),

('referral', jsonb_build_object(
  'enabled', true,
  'reward_days', 7,
  'reward_amount', 0,
  'description', 'Invite friends with your referral code. When they purchase premium, you earn bonus premium days.'
), true),

('resources', jsonb_build_object(
  'max_upload_mb', 50,
  'compress_pdfs', true,
  'default_access_type', 'FREE',
  'view_dedupe_minutes', 30,
  'pdf_token_ttl_seconds', 300,
  'require_login_for_free', false,
  'allow_student_uploads', true,
  'allow_requests', true
), true),

('payment', jsonb_build_object(
  'currency', 'NPR',
  'instructions', 'Pay the plan amount using one of the methods below, then submit the transaction reference and a screenshot. Payments are verified manually, usually within 24 hours.',
  'methods', jsonb_build_array(
    jsonb_build_object('id', 'esewa',  'label', 'eSewa',         'enabled', true,  'account_name', '', 'account_id', '', 'qr_path', null),
    jsonb_build_object('id', 'khalti', 'label', 'Khalti',        'enabled', true,  'account_name', '', 'account_id', '', 'qr_path', null),
    jsonb_build_object('id', 'bank',   'label', 'Bank transfer', 'enabled', false, 'account_name', '', 'account_id', '', 'bank_name', '', 'qr_path', null)
  )
), true),

('scgpa', jsonb_build_object(
  'scale', 4.0,
  'decimals', 2,
  'min_pass_points', 2.0,
  'grades', jsonb_build_array(
    jsonb_build_object('grade', 'A+', 'points', 4.0),
    jsonb_build_object('grade', 'A',  'points', 3.7),
    jsonb_build_object('grade', 'B+', 'points', 3.3),
    jsonb_build_object('grade', 'B',  'points', 3.0),
    jsonb_build_object('grade', 'C+', 'points', 2.7),
    jsonb_build_object('grade', 'C',  'points', 2.3),
    jsonb_build_object('grade', 'D',  'points', 2.0),
    jsonb_build_object('grade', 'F',  'points', 0)
  )
), true)
on conflict (key) do nothing;

-- Mirror of the grade table (site_settings.scgpa is the editable source of truth)
insert into public.scgpa_grades (grade, points, sort_order) values
  ('A+', 4.0, 1), ('A', 3.7, 2), ('B+', 3.3, 3), ('B', 3.0, 4),
  ('C+', 2.7, 5), ('C', 2.3, 6), ('D', 2.0, 7), ('F', 0, 8)
on conflict (grade) do nothing;

-- Placeholder premium plans (prices editable from admin)
insert into public.premium_plans (name, price, duration_days, description, benefits, sort_order) values
  ('Weekly',      49,   7,   'Try premium for a week',          '["All premium resources"]'::jsonb, 1),
  ('Monthly',     149,  30,  'Best for a single exam season',   '["All premium resources"]'::jsonb, 2),
  ('Quarterly',   399,  90,  'Covers most of a semester',       '["All premium resources"]'::jsonb, 3),
  ('Half-Yearly', 699,  180, 'A full semester and more',        '["All premium resources"]'::jsonb, 4),
  ('Yearly',      1199, 365, 'Best value for the whole year',   '["All premium resources"]'::jsonb, 5)
on conflict (name) do nothing;
