-- Reading Tracker — Фаза 8B: дневной лимит распознавания фото (Claude Vision).
-- Выполнить в Supabase → SQL Editor, под владельцем проекта. Идемпотентно, можно запускать повторно.

create table if not exists public.ocr_usage (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

alter table public.ocr_usage enable row level security;

drop policy if exists "ocr_usage_select_own" on public.ocr_usage;
drop policy if exists "ocr_usage_insert_own" on public.ocr_usage;
drop policy if exists "ocr_usage_update_own" on public.ocr_usage;

create policy "ocr_usage_select_own" on public.ocr_usage for select to authenticated using ((select auth.uid()) = user_id);
create policy "ocr_usage_insert_own" on public.ocr_usage for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ocr_usage_update_own" on public.ocr_usage for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update on public.ocr_usage to authenticated;
