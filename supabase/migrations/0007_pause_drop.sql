-- Reading Tracker — Фаза 9B: пауза, отказ от книги и архив прочитанного.
-- Выполнить в Supabase → SQL Editor, под владельцем проекта. Идемпотентно, можно запускать повторно.

-- books.shelf — добавлена полка "dropped" (брошено), RLS не меняется.
alter table public.books drop constraint if exists books_shelf_check;
alter table public.books add constraint books_shelf_check
  check (shelf in ('want', 'reading', 'done', 'paused', 'dropped'));

-- readings — причина паузы/отказа уже была (pause_reason, текст, общий код для обоих случаев).
-- Добавляем заметку, дату остановки и признак "брошено": он отличает прочтение, закрытое
-- отказом, от обычного дочитывания, чтобы брошенные книги не попадали в «Прочитано» и статистику.
alter table public.readings add column if not exists pause_note text;
alter table public.readings add column if not exists stopped_at timestamptz;
alter table public.readings add column if not exists is_dropped boolean not null default false;

alter table public.readings drop constraint if exists readings_pause_note_check;
alter table public.readings add constraint readings_pause_note_check
  check (pause_note is null or char_length(pause_note) <= 1000);

-- RLS и права не меняются: таблицы уже защищены политиками из 0001_init.sql.
