#!/usr/bin/env bash
# Импорт данных из бэкапа Supabase (pg_dump, custom format) в собственный PostgreSQL.
#
#   npm run db:migrate
#   scripts/db-import.sh ~/backups/reading-tracker/full_ГГГГ-ММ-ДД.dump
#
# Переносит 7 таблиц public и создаёт пользователей из auth.users с теми же UUID.
# Пароли и привязку Google не переносит. Фото из Storage в дампе нет.
# Работает только по пустым таблицам и одной транзакцией: ничего не удаляет и не перезаписывает.
set -euo pipefail

DUMP="${1:?Укажите путь к файлу .dump}"
PG_BIN="${PG_BIN:-/usr/lib/postgresql/17/bin}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -z "${DATABASE_URL:-}" && -f "$ROOT/.env.local" ]]; then
  DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' "$ROOT/.env.local" | head -n 1)"
fi
: "${DATABASE_URL:?DATABASE_URL не задан}"

# Порядок важен для внешних ключей.
TABLES=(books readings sessions notes goals settings ocr_usage)

# В SQL попадает хеш пароля из auth.users, поэтому файл временный (права 600) и удаляется.
SQL="$(mktemp)"
trap 'rm -f "$SQL"' EXIT

# Блок "COPY ... \." одной таблицы из дампа.
copy_block() {
  "$PG_BIN/pg_restore" --data-only --schema="$1" --table="$2" -f - "$DUMP" |
    sed -n '/^COPY /,/^\\\.$/p'
}

# Число строк таблицы в дампе.
dump_count() {
  copy_block "$1" "$2" | awk '!/^COPY / && !/^\\\.$/ { n++ } END { print n + 0 }'
}

users_block="$(copy_block auth users)"
[[ -n "$users_block" ]] || { echo "В дампе нет данных auth.users" >&2; exit 1; }
users_columns="$(sed -n '1s/^COPY auth\.users (\(.*\)) FROM stdin;$/\1/p' <<<"$users_block")"

{
  echo "set client_encoding = 'UTF8';"
  cat <<'EOSQL'
do $$
begin
  if exists (select from public."user") or exists (select from public.books)
     or exists (select from public.readings) or exists (select from public.sessions)
     or exists (select from public.notes) or exists (select from public.goals)
     or exists (select from public.settings) or exists (select from public.ocr_usage) then
    raise exception 'Таблицы не пустые, импорт отменён';
  end if;
end $$;
EOSQL
  echo "create temp table auth_users (${users_columns//, / text, } text) on commit drop;"
  sed '1s/^COPY auth\.users /COPY pg_temp.auth_users /' <<<"$users_block"
  cat <<'EOSQL'
insert into public."user" (id, name, email, email_verified, image, created_at, updated_at)
select
  id::uuid,
  coalesce(
    nullif(raw_user_meta_data::jsonb ->> 'full_name', ''),
    nullif(raw_user_meta_data::jsonb ->> 'name', ''),
    split_part(email, '@', 1)
  ),
  lower(email),
  email_confirmed_at is not null,
  nullif(raw_user_meta_data::jsonb ->> 'avatar_url', ''),
  created_at::timestamptz,
  updated_at::timestamptz
from pg_temp.auth_users
where deleted_at is null and nullif(email, '') is not null;
EOSQL
  for t in "${TABLES[@]}"; do
    block="$(copy_block public "$t")"
    [[ -n "$block" ]] || { echo "В дампе нет данных public.$t" >&2; exit 1; }
    printf '%s\n' "$block"
  done
} >"$SQL"

"$PG_BIN/psql" "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$SQL"

echo "Число строк (дамп / база):"
status=0
for t in auth.users "${TABLES[@]/#/public.}"; do
  schema="${t%.*}" table="${t#*.}"
  target="public.$table"
  [[ "$t" == auth.users ]] && target='public."user"'
  in_dump="$(dump_count "$schema" "$table")"
  in_db="$("$PG_BIN/psql" "$DATABASE_URL" -X -At -c "select count(*) from $target")"
  mark=OK
  [[ "$in_dump" == "$in_db" ]] || { mark=РАСХОЖДЕНИЕ; status=1; }
  printf '  %-18s %6s / %-6s %s\n' "$t" "$in_dump" "$in_db" "$mark"
done
exit "$status"
