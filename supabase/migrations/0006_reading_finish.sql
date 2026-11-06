-- Reading Tracker — Фаза 9A: экран «Книга прочитана» (оценка, отзыв, итог).
-- Выполнить в Supabase → SQL Editor, под владельцем проекта. Идемпотентно, можно запускать повторно.

-- "Что я понял" хранится в уже существующей колонке readings.summary — отдельная колонка не нужна.
-- rating был numeric(2,1) с проверкой 0..5; экран использует целую оценку 1..5 (или пусто) —
-- тип и ограничение приводятся к этому виду.

alter table public.readings
  alter column rating type integer using round(rating)::integer;

alter table public.readings
  drop constraint if exists readings_rating_check;

alter table public.readings
  add constraint readings_rating_check check (rating is null or (rating between 1 and 5));

alter table public.readings
  add column if not exists review text;
