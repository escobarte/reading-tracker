# SETUP — Reading Tracker

> Что настроено вне кода и как это повторить: GitHub, Vercel, Supabase, переменные окружения.
> Ключи и пароли в этот файл не записываем. Обновляется, когда меняется настройка.

---

## 1. Как всё связано

| Сервис | Зачем | Что делает владелец |
|---|---|---|
| GitHub | хранит код и ветки | создаёт ветки, делает commit, merge, push |
| Vercel | публикует сайт | сам собирает сайт после push; основная ветка получает постоянный адрес, остальные ветки превью-адрес |
| Supabase | база данных и вход | хранит таблицы и пользователя владельца |
| `.env.local` | ключи на компьютере | файл в корне репозитория, не попадает в git |
| Environment Variables в Vercel | те же ключи для сайта | вводятся один раз вручную |

Адрес основного сайта: https://reading-tracker-one-steel.vercel.app

## 2. Vercel (сделано в Фазе 1)

1. vercel.com → Add New → Project → выбрать репозиторий с GitHub (аккаунт уже связан). Framework подхватывается сам (Next.js), настройки по умолчанию.
2. После этого каждый push в `main` обновляет основной сайт, каждый push в другую ветку создаёт превью-адрес (Deployments → строка ветки → Visit).
3. Settings → Deployment Protection: превью-адреса веток по умолчанию закрыты входом в Vercel. Для проверки установки PWA на телефоне защиту на превью нужно отключить (основной адрес защитой не закрыт).

## 3. Supabase (сделано в Фазе 2)

**Проект**
1. supabase.com → Sign in (через GitHub) → New project.
2. Name: `Reading Tracker`. Database password: Generate и сохранить в менеджер паролей (в приложении не нужен). Region: Europe. План: Free.
3. Security при создании: **Enable Data API** включить, **Automatically expose new tables** выключить (права на таблицы мы выдаём вручную в SQL), **Enable automatic RLS** включить (страховка для будущих таблиц).
4. Подождать 1–2 минуты, пока статус станет Healthy.

**Закрыть регистрацию**
1. Authentication → Sign In / Providers → User Signups.
2. Выключить **Allow new users to sign up**. Провайдер Email остаётся включённым.
3. Остальные переключатели (manual linking, anonymous sign-ins) выключены. «Confirm email» можно оставить включённым: пользователь создаётся с автоподтверждением.

**Создать пользователя владельца**
1. Authentication → Users → Add user → **Create new user** (не «Send invitation»).
2. Email, сильный пароль (сохранить в менеджер паролей), галочка **Auto Confirm User**, Create user.
3. Письма при этом не отправляются, почтовый сервис не нужен.

**Забыл пароль**
Восстановления по почте в приложении нет. Сброс вручную: Authentication → Users → строка пользователя → меню «…» → Send password recovery / Reset password, либо удалить пользователя и создать заново (данные привязаны к пользователю, удалять только если база пустая).

## 4. Ключи

Где взять: кнопка **Connect** вверху проекта Supabase → вкладка Framework → Next.js, блок `.env.local`. Второй путь: Project Settings → API Keys.

| Переменная | Что это | Секретная? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | адрес проекта `https://…supabase.co` | нет |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | публичный ключ, начинается с `sb_publishable_` | нет, защищён правилами RLS |
| Secret key (`sb_secret_…`) | полный доступ к базе | **да. Не копировать, не отправлять, не использовать** |
| Database password | пароль самой базы | **да. Только в менеджере паролей** |

**Vercel:** проект → Settings → Environment Variables → Add Environment Variable. Две переменные из таблицы выше, Type **Config**, Environments **Production и Preview**. В Value только сам адрес или ключ, без имени и знака `=`. Новые значения применяются к следующим сборкам.

**Локально:** в корне репозитория файл `.env.local` (его нет в git):
```
NEXT_PUBLIC_SUPABASE_URL=https://ВАШ-ПРОЕКТ.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```
После изменения файла перезапустить `npm run dev`.

## 5. SQL-миграции

Файлы лежат в `supabase/migrations/`. Выполнять по порядку: Supabase → SQL Editor → New query → вставить содержимое файла → Run. Результат должен быть без ошибок (Success). Таблицы видны в Table Editor.

Проверка защиты (RLS включён на всех таблицах):
```
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```
У всех шести таблиц (`books`, `readings`, `sessions`, `notes`, `goals`, `settings`) `rowsecurity` должно быть `true`.

## 6. Если что-то не работает

| Симптом | Что проверить |
|---|---|
| Вход не пускает, «Неверный email или пароль» | пользователь создан с Auto Confirm User; пароль без пробелов; email совпадает |
| Сайт на Vercel не видит базу | переменные добавлены для нужной среды (Production или Preview), имена совпадают буква в букву, после добавления сделана новая сборка |
| Превью-адрес ветки просит вход в Vercel | отключить Deployment Protection для превью |
| Таблицы пустые или ошибка прав | выполнен ли SQL-файл целиком; есть ли в нём `grant … to authenticated` |

## 7. Отложено

Регистрация новых пользователей и восстановление пароля по почте: нужен свой домен и почтовый сервис (например, Resend). Вернёмся, когда появится домен.
