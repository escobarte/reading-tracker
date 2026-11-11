-- Reading Tracker — Фаза: Коллекция и план года.
-- Выполнить в Supabase → SQL Editor, под владельцем проекта. Идемпотентно, можно запускать повторно.
--
-- Примечание: файл назван 0009, а не 0008 — 0008 уже занят миграцией notes_without_book.sql
-- (free-notes, предыдущая фаза в этой же ветке работ).

-- books.shelf — добавлена полка "collection" (коллекция: всё, что может захочется прочитать
-- когда-нибудь, в отличие от "want" — то, что запланировано к чтению уже сейчас).
alter table public.books drop constraint if exists books_shelf_check;
alter table public.books add constraint books_shelf_check
  check (shelf in ('want', 'reading', 'done', 'paused', 'dropped', 'collection'));

-- RLS и права не меняются: таблицы уже защищены политиками из 0001_init.sql.
-- Таблица goals и её данные не трогаются: годовая цель (yearly) просто перестаёт
-- использоваться приложением — см. отчёт по фазе.
