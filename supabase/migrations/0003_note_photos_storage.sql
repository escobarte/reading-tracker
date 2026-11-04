-- Reading Tracker — Фаза 8B: бакет для фото страниц и политики доступа.
-- Выполнено владельцем в Supabase → SQL Editor (запись для истории, не выполнять повторно).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-photos', 'note-photos', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "note_photos_select_own" on storage.objects;
drop policy if exists "note_photos_insert_own" on storage.objects;
drop policy if exists "note_photos_update_own" on storage.objects;
drop policy if exists "note_photos_delete_own" on storage.objects;

create policy "note_photos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'note-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "note_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'note-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "note_photos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'note-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "note_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'note-photos' and (storage.foldername(name))[1] = auth.uid()::text);
