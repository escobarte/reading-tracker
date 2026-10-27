-- Reading Tracker — Фаза 6: дедлайн по книге.
-- Выполнить в Supabase → SQL Editor под владельцем проекта. Идемпотентна,
-- можно запускать повторно.

-- goals.rest_days был задуман как массив дней недели без чтения, но создан
-- как int (неиспользуемый). Заменяется на правильный тип.
alter table public.goals
  add column if not exists skip_weekdays int[] not null default '{}';

alter table public.goals
  drop column if exists rest_days;

-- Одна запись дедлайна на прочтение (как и для годовой/дневной цели в 0001_init.sql).
create unique index if not exists goals_one_deadline_per_reading
  on public.goals (user_id, reading_id)
  where kind = 'deadline';
