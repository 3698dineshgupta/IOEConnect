-- =============================================================================
-- IOE Connect :: 0002 Row Level Security, grants, safe views
-- Principles:
--   * RLS enabled on every table; deny by default.
--   * Users read/write only their own rows.
--   * Curriculum + PUBLISHED resource metadata are public.
--   * telegram_file_id / telegram_message_id are NEVER readable by anon or
--     authenticated (column privileges). Only service_role (server) reads them.
--   * Admin-only: payment review, audit logs, settings writes, moderation.
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'programs','years','semesters','subjects','profiles','resources','premium_plans',
    'payments','referrals','audit_logs','student_uploads','resource_requests',
    'contact_messages','bug_reports','merch_products','scgpa_grades','scgpa_saves',
    'resource_views','search_events','site_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Curriculum: public read, admin write
-- -----------------------------------------------------------------------------
drop policy if exists programs_public_read on public.programs;
create policy programs_public_read on public.programs
  for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists programs_admin_write on public.programs;
create policy programs_admin_write on public.programs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists years_public_read on public.years;
create policy years_public_read on public.years
  for select to anon, authenticated using (true);
drop policy if exists years_admin_write on public.years;
create policy years_admin_write on public.years
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists semesters_public_read on public.semesters;
create policy semesters_public_read on public.semesters
  for select to anon, authenticated using (true);
drop policy if exists semesters_admin_write on public.semesters;
create policy semesters_admin_write on public.semesters
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists subjects_public_read on public.subjects;
create policy subjects_public_read on public.subjects
  for select to anon, authenticated using (true);
drop policy if exists subjects_admin_write on public.subjects;
create policy subjects_admin_write on public.subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Profiles: own row read/update; admins read all / update (guard trigger
-- restricts privileged columns). No client inserts (trigger creates rows).
-- -----------------------------------------------------------------------------
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
drop policy if exists profiles_super_admin_delete on public.profiles;
create policy profiles_super_admin_delete on public.profiles
  for delete to authenticated using (public.is_super_admin());

revoke insert on public.profiles from anon, authenticated;
revoke all on public.profiles from anon;

-- -----------------------------------------------------------------------------
-- Resources
-- -----------------------------------------------------------------------------
drop policy if exists resources_public_read on public.resources;
create policy resources_public_read on public.resources
  for select to anon, authenticated using (status = 'PUBLISHED' or public.is_admin());
drop policy if exists resources_admin_write on public.resources;
create policy resources_admin_write on public.resources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Column privileges: hide Telegram identifiers from every API role.
-- NOTE: `select('*')` on resources from anon/authenticated clients will fail;
-- select explicit columns or use the `public_resources` view.
revoke all on public.resources from anon, authenticated;
grant delete on public.resources to authenticated; -- RLS: admins only
grant select (
  id, subject_id, title, description, resource_type, access_type,
  original_file_name, file_size, compressed_file_size, page_count,
  available_years, year_page_ranges, exam_type, uploaded_by, status,
  view_count, published_at, created_at, updated_at
) on public.resources to anon, authenticated;
grant insert (
  subject_id, title, description, resource_type, access_type,
  original_file_name, file_size, compressed_file_size, page_count,
  available_years, year_page_ranges, exam_type, uploaded_by, status
) on public.resources to authenticated;
grant update (
  subject_id, title, description, resource_type, access_type,
  original_file_name, page_count, available_years, year_page_ranges,
  exam_type, status
) on public.resources to authenticated;

-- Safe public view (RLS of the caller applies via security_invoker).
create or replace view public.public_resources
with (security_invoker = true) as
select
  r.id, r.subject_id, r.title, r.description, r.resource_type, r.access_type,
  r.original_file_name, r.file_size, r.compressed_file_size, r.page_count,
  r.available_years, r.year_page_ranges, r.exam_type, r.status, r.view_count,
  r.published_at, r.created_at, r.updated_at,
  s.slug as subject_slug, s.name as subject_name, s.code as subject_code
from public.resources r
join public.subjects s on s.id = r.subject_id
where r.status = 'PUBLISHED';

revoke all on public.public_resources from anon, authenticated;
grant select on public.public_resources to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Premium plans: public read of active plans; admin write
-- -----------------------------------------------------------------------------
drop policy if exists premium_plans_public_read on public.premium_plans;
create policy premium_plans_public_read on public.premium_plans
  for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists premium_plans_admin_write on public.premium_plans;
create policy premium_plans_admin_write on public.premium_plans
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Payments: users insert/read own PENDING submissions; admins read.
-- Status changes ONLY via approve_payment / reject_payment.
-- -----------------------------------------------------------------------------
drop policy if exists payments_own_read on public.payments;
create policy payments_own_read on public.payments
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists payments_own_insert on public.payments;
create policy payments_own_insert on public.payments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'PENDING'
    and reviewed_by is null
    and reviewed_at is null
  );
revoke update, delete on public.payments from anon, authenticated;
revoke all on public.payments from anon;

-- -----------------------------------------------------------------------------
-- Referrals: participants read; admins read/manage. Inserts by trigger only.
-- -----------------------------------------------------------------------------
drop policy if exists referrals_participant_read on public.referrals;
create policy referrals_participant_read on public.referrals
  for select to authenticated
  using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());
drop policy if exists referrals_admin_update on public.referrals;
create policy referrals_admin_update on public.referrals
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.referrals from anon, authenticated;
revoke all on public.referrals from anon;

-- -----------------------------------------------------------------------------
-- Audit logs: admin read, admin insert (as themselves). Append-only.
-- -----------------------------------------------------------------------------
drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated using (public.is_admin());
drop policy if exists audit_logs_admin_insert on public.audit_logs;
create policy audit_logs_admin_insert on public.audit_logs
  for insert to authenticated with check (public.is_admin() and admin_id = auth.uid());
revoke update, delete on public.audit_logs from anon, authenticated;
revoke all on public.audit_logs from anon;

-- -----------------------------------------------------------------------------
-- Student uploads: own insert/read; edit/delete own while PENDING; admin all.
-- -----------------------------------------------------------------------------
drop policy if exists student_uploads_own_read on public.student_uploads;
create policy student_uploads_own_read on public.student_uploads
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists student_uploads_own_insert on public.student_uploads;
create policy student_uploads_own_insert on public.student_uploads
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'PENDING' and resource_id is null and review_note is null);
drop policy if exists student_uploads_own_update on public.student_uploads;
create policy student_uploads_own_update on public.student_uploads
  for update to authenticated
  using ((user_id = auth.uid() and status = 'PENDING') or public.is_admin())
  with check (
    public.is_admin()
    or (user_id = auth.uid() and status = 'PENDING' and resource_id is null and review_note is null)
  );
drop policy if exists student_uploads_own_delete on public.student_uploads;
create policy student_uploads_own_delete on public.student_uploads
  for delete to authenticated
  using ((user_id = auth.uid() and status = 'PENDING') or public.is_admin());
revoke all on public.student_uploads from anon;

-- -----------------------------------------------------------------------------
-- Resource requests: same pattern
-- -----------------------------------------------------------------------------
drop policy if exists resource_requests_own_read on public.resource_requests;
create policy resource_requests_own_read on public.resource_requests
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists resource_requests_own_insert on public.resource_requests;
create policy resource_requests_own_insert on public.resource_requests
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'PENDING' and admin_note is null);
drop policy if exists resource_requests_own_update on public.resource_requests;
create policy resource_requests_own_update on public.resource_requests
  for update to authenticated
  using ((user_id = auth.uid() and status = 'PENDING') or public.is_admin())
  with check (public.is_admin() or (user_id = auth.uid() and status = 'PENDING' and admin_note is null));
drop policy if exists resource_requests_own_delete on public.resource_requests;
create policy resource_requests_own_delete on public.resource_requests
  for delete to authenticated
  using ((user_id = auth.uid() and status = 'PENDING') or public.is_admin());
revoke all on public.resource_requests from anon;

-- -----------------------------------------------------------------------------
-- Contact messages: anyone may submit; admins read/manage.
-- -----------------------------------------------------------------------------
drop policy if exists contact_messages_insert on public.contact_messages;
create policy contact_messages_insert on public.contact_messages
  for insert to anon, authenticated
  with check (status = 'UNREAD' and (user_id is null or user_id = auth.uid()));
drop policy if exists contact_messages_admin on public.contact_messages;
create policy contact_messages_admin on public.contact_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke select, update, delete on public.contact_messages from anon;

-- -----------------------------------------------------------------------------
-- Bug reports: anyone may submit; reporter reads own; admins manage.
-- -----------------------------------------------------------------------------
drop policy if exists bug_reports_insert on public.bug_reports;
create policy bug_reports_insert on public.bug_reports
  for insert to anon, authenticated
  with check (status = 'OPEN' and (user_id is null or user_id = auth.uid()));
drop policy if exists bug_reports_own_read on public.bug_reports;
create policy bug_reports_own_read on public.bug_reports
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists bug_reports_admin_write on public.bug_reports;
create policy bug_reports_admin_write on public.bug_reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists bug_reports_admin_delete on public.bug_reports;
create policy bug_reports_admin_delete on public.bug_reports
  for delete to authenticated using (public.is_admin());
revoke select, update, delete on public.bug_reports from anon;

-- -----------------------------------------------------------------------------
-- Merch: public read of available items; admin write
-- -----------------------------------------------------------------------------
drop policy if exists merch_public_read on public.merch_products;
create policy merch_public_read on public.merch_products
  for select to anon, authenticated using (is_available or public.is_admin());
drop policy if exists merch_admin_write on public.merch_products;
create policy merch_admin_write on public.merch_products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- SCGPA
-- -----------------------------------------------------------------------------
drop policy if exists scgpa_grades_public_read on public.scgpa_grades;
create policy scgpa_grades_public_read on public.scgpa_grades
  for select to anon, authenticated using (true);
drop policy if exists scgpa_grades_admin_write on public.scgpa_grades;
create policy scgpa_grades_admin_write on public.scgpa_grades
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists scgpa_saves_own on public.scgpa_saves;
create policy scgpa_saves_own on public.scgpa_saves
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.scgpa_saves from anon;

-- -----------------------------------------------------------------------------
-- Analytics. resource_views written only via record_resource_view() RPC.
-- -----------------------------------------------------------------------------
drop policy if exists resource_views_admin_read on public.resource_views;
create policy resource_views_admin_read on public.resource_views
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.resource_views from anon, authenticated;
revoke all on public.resource_views from anon;

drop policy if exists search_events_insert on public.search_events;
create policy search_events_insert on public.search_events
  for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());
drop policy if exists search_events_admin_read on public.search_events;
create policy search_events_admin_read on public.search_events
  for select to authenticated using (public.is_admin());
revoke select, update, delete on public.search_events from anon;
revoke update, delete on public.search_events from authenticated;

-- -----------------------------------------------------------------------------
-- Site settings: public read of public keys; admin write.
-- -----------------------------------------------------------------------------
drop policy if exists site_settings_read on public.site_settings;
create policy site_settings_read on public.site_settings
  for select to anon, authenticated using (is_public or public.is_admin());
drop policy if exists site_settings_admin_write on public.site_settings;
create policy site_settings_admin_write on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, update, delete on public.site_settings from anon;

-- -----------------------------------------------------------------------------
-- Function execute privileges
-- -----------------------------------------------------------------------------
revoke execute on function public.generate_referral_code() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_super_admin() to anon, authenticated;
