-- Follow-ups found during integration.

-- 1. At most one PENDING payment per user (closes a race in submitPayment).
create unique index if not exists payments_one_pending_per_user
  on public.payments (user_id) where status = 'PENDING';

-- 2. Users may read their own view history (dashboard "Recently viewed").
drop policy if exists resource_views_own_read on public.resource_views;
create policy resource_views_own_read on public.resource_views
  for select to authenticated using (user_id = auth.uid());
grant select on public.resource_views to authenticated;

-- 3. Avatars bucket: public read, users write only under their own <uid>/ folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
