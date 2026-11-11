-- Reading Tracker — feat/free-notes: заметка без привязки к книге.
-- Выполнить в Supabase → SQL Editor, под владельцем проекта. Идемпотентно, можно запускать повторно.

-- notes.book_id становится необязательным. Внешний ключ и `on delete cascade` не меняются:
-- заметки с книгой продолжают удаляться вместе с книгой, заметки без книги этим не затронуты.
-- DROP NOT NULL не ошибается, если колонка уже допускает NULL — безопасно запускать повторно.
alter table public.notes alter column book_id drop not null;
