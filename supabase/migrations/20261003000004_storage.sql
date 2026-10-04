-- =============================================================================
-- IOE Connect :: 0004 Storage buckets + policies
-- Path convention for user-owned buckets: `<auth.uid()>/<filename>`
--   payment-screenshots, student-uploads, bug-screenshots
-- Admin-managed: merch (public read), site-assets (private; authenticated read)
-- Serve private files via short-lived signed URLs created server-side.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-screenshots', 'payment-screenshots', false, 5242880,
     array['image/png', 'image/jpeg', 'image/webp']),
  ('student-uploads', 'student-uploads', false, 52428800,
     array['application/pdf']),
  ('bug-screenshots', 'bug-screenshots', false, 5242880,
     array['image/png', 'image/jpeg', 'image/webp']),
  ('merch', 'merch', true, 5242880,
     array['image/png', 'image/jpeg', 'image/webp']),
  ('site-assets', 'site-assets', false, 10485760,
     array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---- user-owned buckets ------------------------------------------------------
drop policy if exists "user_buckets_insert_own" on storage.objects;
create policy "user_buckets_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('payment-screenshots', 'student-uploads', 'bug-screenshots')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user_buckets_read_own_or_admin" on storage.objects;
create policy "user_buckets_read_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('payment-screenshots', 'student-uploads', 'bug-screenshots')
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- Users may delete their own student uploads / bug screenshots (e.g. cancel);
-- payment screenshots are evidence and can only be removed by admins.
drop policy if exists "user_buckets_delete_own_or_admin" on storage.objects;
create policy "user_buckets_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    (bucket_id in ('student-uploads', 'bug-screenshots')
       and (storage.foldername(name))[1] = auth.uid()::text)
    or (bucket_id in ('payment-screenshots', 'student-uploads', 'bug-screenshots')
       and public.is_admin())
  );

-- ---- merch (public images) ---------------------------------------------------
drop policy if exists "merch_public_read" on storage.objects;
create policy "merch_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'merch');

-- ---- site-assets -------------------------------------------------------------
drop policy if exists "site_assets_authenticated_read" on storage.objects;
create policy "site_assets_authenticated_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'site-assets');

-- ---- admin write on admin-managed buckets ------------------------------------
drop policy if exists "admin_assets_insert" on storage.objects;
create policy "admin_assets_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('merch', 'site-assets') and public.is_admin());

drop policy if exists "admin_assets_update" on storage.objects;
create policy "admin_assets_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('merch', 'site-assets') and public.is_admin())
  with check (bucket_id in ('merch', 'site-assets') and public.is_admin());

drop policy if exists "admin_assets_delete" on storage.objects;
create policy "admin_assets_delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('merch', 'site-assets') and public.is_admin());
