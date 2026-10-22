-- Reading Tracker — Фаза 2: таблицы, RLS, права.
-- Выполнить в Supabase → SQL Editor, один раз, под владельцем проекта.

-- books ----------------------------------------------------------------

create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  title text not null,
  author text,
  cover_url text,
  total_pages int check (total_pages > 0),
  format text not null default 'paper' check (format in ('paper', 'ebook')),
  shelf text not null default 'want' check (shelf in ('want', 'reading', 'done', 'paused')),
  queue_position int,
  series text,
  series_number numeric,
  genre text,
  tags text[] not null default '{}',
  google_books_id text,
  isbn text,
  language text
);

-- readings ---------------------------------------------------------------

create table public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  book_id uuid not null references public.books(id) on delete cascade,
  started_at timestamptz,
  finished_at timestamptz,
  rating numeric(2, 1) check (rating >= 0 and rating <= 5),
  summary text,
  pause_reason text
);

-- sessions -----------------------------------------------------------------

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  reading_id uuid not null references public.readings(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  page_from int,
  page_to int,
  pages_read int,
  seconds int,
  source text not null default 'timer' check (source in ('timer', 'manual'))
);

-- notes --------------------------------------------------------------------

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  book_id uuid not null references public.books(id) on delete cascade,
  type text check (type in ('quote', 'thought', 'word', 'photo')),
  body text,
  meaning text,
  page int,
  photo_path text,
  is_favorite boolean not null default false,
  tags text[] not null default '{}'
);

-- goals --------------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text check (kind in ('yearly', 'daily', 'deadline')),
  target_value int,
  year int,
  reading_id uuid references public.readings(id) on delete cascade,
  due_date date,
  rest_days int not null default 0
);

-- Одна годовая цель на год и одна дневная цель на пользователя.
create unique index goals_one_yearly_per_year on public.goals (user_id, year) where kind = 'yearly';
create unique index goals_one_daily_per_user on public.goals (user_id) where kind = 'daily';

-- settings -------------------------------------------------------------------
-- Одна строка на пользователя, поэтому user_id — первичный ключ, без отдельного id.

create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  language text not null default 'ru' check (language in ('ru', 'en')),
  theme text not null default 'light' check (theme in ('light', 'dark')),
  reminder_time time,
  updated_at timestamptz not null default now()
);

-- Индексы --------------------------------------------------------------------

create index books_user_id on public.books (user_id);
create index readings_user_id on public.readings (user_id);
create index sessions_user_id on public.sessions (user_id);
create index notes_user_id on public.notes (user_id);
create index goals_user_id on public.goals (user_id);

create index books_user_shelf_queue on public.books (user_id, shelf, queue_position);
create index sessions_user_started_at on public.sessions (user_id, started_at);
create index sessions_reading_id on public.sessions (reading_id);
create index notes_book_id on public.notes (book_id);

-- Row Level Security -----------------------------------------------------------

alter table public.books enable row level security;
alter table public.readings enable row level security;
alter table public.sessions enable row level security;
alter table public.notes enable row level security;
alter table public.goals enable row level security;
alter table public.settings enable row level security;

create policy "books_select_own" on public.books for select to authenticated using ((select auth.uid()) = user_id);
create policy "books_insert_own" on public.books for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "books_update_own" on public.books for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "books_delete_own" on public.books for delete to authenticated using ((select auth.uid()) = user_id);

create policy "readings_select_own" on public.readings for select to authenticated using ((select auth.uid()) = user_id);
create policy "readings_insert_own" on public.readings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "readings_update_own" on public.readings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "readings_delete_own" on public.readings for delete to authenticated using ((select auth.uid()) = user_id);

create policy "sessions_select_own" on public.sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "sessions_insert_own" on public.sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "sessions_update_own" on public.sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "sessions_delete_own" on public.sessions for delete to authenticated using ((select auth.uid()) = user_id);

create policy "notes_select_own" on public.notes for select to authenticated using ((select auth.uid()) = user_id);
create policy "notes_insert_own" on public.notes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "notes_update_own" on public.notes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "notes_delete_own" on public.notes for delete to authenticated using ((select auth.uid()) = user_id);

create policy "goals_select_own" on public.goals for select to authenticated using ((select auth.uid()) = user_id);
create policy "goals_insert_own" on public.goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "goals_update_own" on public.goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals_delete_own" on public.goals for delete to authenticated using ((select auth.uid()) = user_id);

create policy "settings_select_own" on public.settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "settings_insert_own" on public.settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "settings_update_own" on public.settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "settings_delete_own" on public.settings for delete to authenticated using ((select auth.uid()) = user_id);

-- Права -------------------------------------------------------------------------
-- В проекте отключено автоматическое открытие новых таблиц для anon/authenticated,
-- поэтому права выдаются явно. anon ничего не получает.

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.books to authenticated;
grant select, insert, update, delete on public.readings to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.settings to authenticated;
